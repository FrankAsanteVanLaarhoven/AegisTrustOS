terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
  # Uncomment for remote state in real environments:
  # backend "s3" {
  #   bucket = "aegis-tf-state"
  #   key    = "staging/terraform.tfstate"
  #   region = "eu-west-2"
  # }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "aegis-trust-os"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "random_password" "db" {
  length  = 24
  special = false
}

# ── Network ──────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags                 = { Name = "aegis-${var.environment}" }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "aegis-${var.environment}-igw" }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = { Name = "aegis-${var.environment}-public-${count.index}" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 8)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "aegis-${var.environment}-private-${count.index}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "aegis-${var.environment}-public" }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_db_subnet_group" "main" {
  name       = "aegis-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "aegis-${var.environment}-db" }
}

resource "aws_security_group" "db" {
  name        = "aegis-${var.environment}-db"
  description = "Postgres for Aegis"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ── RDS Postgres ─────────────────────────────────────────
resource "aws_db_instance" "postgres" {
  identifier                 = "aegis-${var.environment}"
  engine                     = "postgres"
  engine_version             = "16"
  instance_class             = var.db_instance_class
  allocated_storage          = var.db_allocated_storage
  db_name                    = "aegis"
  username                   = "aegis"
  password                   = random_password.db.result
  db_subnet_group_name       = aws_db_subnet_group.main.name
  vpc_security_group_ids     = [aws_security_group.db.id]
  skip_final_snapshot        = var.environment != "prod"
  publicly_accessible        = false
  multi_az                   = var.environment == "prod"
  backup_retention_period    = var.environment == "prod" ? 7 : 1
  deletion_protection        = var.environment == "prod"
  storage_encrypted          = true
  auto_minor_version_upgrade = true
  tags                       = { Name = "aegis-${var.environment}-pg" }
}

# ── S3 evidence ──────────────────────────────────────────
resource "aws_s3_bucket" "evidence" {
  bucket_prefix = "aegis-${var.environment}-evidence-"
  force_destroy = var.environment != "prod"
}

resource "aws_s3_bucket_versioning" "evidence" {
  bucket = aws_s3_bucket.evidence.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "evidence" {
  bucket = aws_s3_bucket.evidence.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "evidence" {
  bucket                  = aws_s3_bucket.evidence.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── Secrets ──────────────────────────────────────────────
resource "aws_secretsmanager_secret" "app" {
  name_prefix = "aegis-${var.environment}-"
  description = "Aegis app secrets (${var.environment})"
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    DATABASE_URL              = "postgresql://aegis:${random_password.db.result}@${aws_db_instance.postgres.address}:5432/aegis"
    AUTH_SECRET               = var.auth_secret != "" ? var.auth_secret : random_password.db.result
    DOCUMENT_ENCRYPTION_KEY   = var.document_encryption_key != "" ? var.document_encryption_key : random_password.db.result
    S3_BUCKET                 = aws_s3_bucket.evidence.id
    S3_REGION                 = var.aws_region
    STORAGE_BACKEND           = "s3"
  })
}

# ── IAM for app runtime (ECS / K8s IRSA attach later) ────
resource "aws_iam_role" "app" {
  name = "aegis-${var.environment}-app"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "app" {
  name = "aegis-${var.environment}-app"
  role = aws_iam_role.app.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.evidence.arn,
          "${aws_s3_bucket.evidence.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [aws_secretsmanager_secret.app.arn]
      }
    ]
  })
}
