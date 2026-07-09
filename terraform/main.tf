# ══════════════════════════════════════════════════════════
#  MR7.AI — Terraform Infrastructure
#  Cloud-agnostic deployment configuration
# ══════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket         = "mr7-ai-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "mr7-terraform-lock"
  }
}

# ── Variables ─────────────────────────────────────────────
variable "aws_region"        { default = "us-east-1" }
variable "environment"       { default = "production" }
variable "project_name"      { default = "mr7-ai" }
variable "cluster_version"   { default = "1.28" }
variable "node_instance_type" { default = "m7g.2xlarge" }
variable "gpu_instance_type"  { default = "g4dn.xlarge" }
variable "min_nodes"          { default = 3 }
variable "max_nodes"          { default = 20 }
variable "db_instance_class"  { default = "db.r7g.large" }
variable "redis_node_type"    { default = "cache.r7g.large" }
variable "openai_api_key"     { sensitive = true }
variable "anthropic_api_key"  { sensitive = true }

# ── Locals ────────────────────────────────────────────────
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = "mr7-team"
  }
}

# ── Provider ──────────────────────────────────────────────
provider "aws" {
  region = var.aws_region
  default_tags { tags = local.common_tags }
}

# ── VPC ───────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "${local.name_prefix}-vpc" }
}

resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 4, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = { Name = "${local.name_prefix}-public-${count.index}", "kubernetes.io/role/elb" = "1" }
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 4, count.index + 3)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = { Name = "${local.name_prefix}-private-${count.index}", "kubernetes.io/role/internal-elb" = "1" }
}

data "aws_availability_zones" "available" { state = "available" }

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = { Name = "${local.name_prefix}-igw" }
}

resource "aws_eip" "nat" {
  count  = 1
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id
  tags = { Name = "${local.name_prefix}-nat" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0"; gateway_id = aws_internet_gateway.main.id }
  tags = { Name = "${local.name_prefix}-public-rt" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0"; nat_gateway_id = aws_nat_gateway.main.id }
  tags = { Name = "${local.name_prefix}-private-rt" }
}

resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# ── EKS Cluster ───────────────────────────────────────────
resource "aws_iam_role" "eks_cluster" {
  name = "${local.name_prefix}-eks-cluster-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole"; Effect = "Allow"; Principal = { Service = "eks.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster" {
  for_each   = toset(["arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"])
  role       = aws_iam_role.eks_cluster.name
  policy_arn = each.value
}

resource "aws_eks_cluster" "main" {
  name     = "${local.name_prefix}-cluster"
  version  = var.cluster_version
  role_arn = aws_iam_role.eks_cluster.arn
  vpc_config {
    subnet_ids              = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }
  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  depends_on = [aws_iam_role_policy_attachment.eks_cluster]
}

# ── Node Group ────────────────────────────────────────────
resource "aws_iam_role" "eks_node" {
  name = "${local.name_prefix}-eks-node-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{ Action = "sts:AssumeRole"; Effect = "Allow"; Principal = { Service = "ec2.amazonaws.com" } }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_node" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
  ])
  role       = aws_iam_role.eks_node.name
  policy_arn = each.value
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${local.name_prefix}-main-nodes"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = aws_subnet.private[*].id
  instance_types  = [var.node_instance_type]
  capacity_type   = "ON_DEMAND"
  scaling_config { desired_size = var.min_nodes; max_size = var.max_nodes; min_size = var.min_nodes }
  update_config { max_unavailable = 1 }
  labels = { role = "general" }
  depends_on = [aws_iam_role_policy_attachment.eks_node]
}

# ── RDS PostgreSQL ────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "random_password" "db" {
  length = 24; special = false
}

resource "aws_db_instance" "main" {
  identifier             = "${local.name_prefix}-postgres"
  engine                 = "postgres"
  engine_version         = "16.1"
  instance_class         = var.db_instance_class
  allocated_storage      = 100
  max_allocated_storage  = 1000
  storage_type           = "gp3"
  storage_encrypted      = true
  db_name                = "mr7ai"
  username               = "mr7admin"
  password               = random_password.db.result
  db_subnet_group_name   = aws_db_subnet_group.main.name
  multi_az               = true
  backup_retention_period = 7
  deletion_protection    = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "${local.name_prefix}-final-snapshot"
  performance_insights_enabled = true
  monitoring_interval    = 60
  enabled_cloudwatch_logs_exports = ["postgresql"]
}

# ── ElastiCache Redis ─────────────────────────────────────
resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name_prefix}-redis-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "${local.name_prefix}-redis"
  description          = "MR7.AI Redis Cache"
  node_type            = var.redis_node_type
  num_cache_clusters   = 2
  engine_version       = "7.2"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  automatic_failover_enabled = true
  multi_az_enabled     = true
}

# ── Secrets Manager ───────────────────────────────────────
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${local.name_prefix}/app-secrets"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    OPENAI_API_KEY    = var.openai_api_key
    ANTHROPIC_API_KEY = var.anthropic_api_key
    DATABASE_URL      = "postgresql://mr7admin:${random_password.db.result}@${aws_db_instance.main.endpoint}/mr7ai"
    REDIS_URL         = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
  })
}

# ── Outputs ───────────────────────────────────────────────
output "cluster_endpoint"     { value = aws_eks_cluster.main.endpoint; sensitive = false }
output "cluster_name"         { value = aws_eks_cluster.main.name }
output "db_endpoint"          { value = aws_db_instance.main.endpoint; sensitive = true }
output "redis_endpoint"       { value = aws_elasticache_replication_group.main.primary_endpoint_address; sensitive = true }
