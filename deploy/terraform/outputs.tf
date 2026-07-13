output "vpc_id" {
  value = aws_vpc.main.id
}

output "rds_endpoint" {
  value     = aws_db_instance.postgres.address
  sensitive = true
}

output "rds_port" {
  value = aws_db_instance.postgres.port
}

output "s3_evidence_bucket" {
  value = aws_s3_bucket.evidence.id
}

output "secrets_arn" {
  value = aws_secretsmanager_secret.app.arn
}

output "app_iam_role_arn" {
  value = aws_iam_role.app.arn
}

output "database_url_secret_hint" {
  value = "Retrieve DATABASE_URL from Secrets Manager: ${aws_secretsmanager_secret.app.name}"
}
