variable "aws_region" {
  type    = string
  default = "eu-west-2"
}

variable "environment" {
  type    = string
  default = "staging"
}

variable "vpc_cidr" {
  type    = string
  default = "10.42.0.0/16"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "auth_secret" {
  type      = string
  default   = ""
  sensitive = true
}

variable "document_encryption_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "enable_ecs" {
  description = "When true, modules/ecs can be applied (future). Staging baseline is data plane only."
  type        = bool
  default     = false
}
