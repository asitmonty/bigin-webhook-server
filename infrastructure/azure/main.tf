# Azure Infrastructure Configuration for SaaS Template
terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Variables
variable "app_name" {
  description = "Name of the SaaS application"
  type        = string
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US"
}

variable "tenant_id" {
  description = "Azure tenant ID"
  type        = string
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "${var.app_name}-${var.environment}-rg"
  location = var.location

  tags = {
    Environment = var.environment
    Application = var.app_name
    ManagedBy   = "Terraform"
  }
}

# App Service Plan
resource "azurerm_service_plan" "main" {
  name                = "${var.app_name}-${var.environment}-plan"
  resource_group_name = azurerm_resource_group.main.name
  location           = azurerm_resource_group.main.location
  os_type            = "Linux"
  sku_name           = var.environment == "prod" ? "P1v2" : "B1"

  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# App Service for API
resource "azurerm_linux_web_app" "api" {
  name                = "${var.app_name}-${var.environment}-api"
  resource_group_name = azurerm_resource_group.main.name
  location           = azurerm_service_plan.main.location
  service_plan_id    = azurerm_service_plan.main.id

  site_config {
    application_stack {
      node_version = "18-lts"
    }
    
    cors {
      allowed_origins = ["https://${var.app_name}.azurewebsites.net"]
    }
  }

  app_settings = {
    "NODE_ENV"                    = var.environment
    "PORT"                        = "8080"
    "DATABASE_URL"                = azurerm_postgresql_flexible_server.main.connection_string
    "REDIS_URL"                   = azurerm_redis_cache.main.hostname
    "JWT_SECRET"                  = azurerm_key_vault_secret.jwt_secret.value
    "STRIPE_SECRET_KEY"           = azurerm_key_vault_secret.stripe_secret.value
    "AUTH0_DOMAIN"                = azurerm_key_vault_secret.auth0_domain.value
    "AUTH0_CLIENT_ID"             = azurerm_key_vault_secret.auth0_client_id.value
    "AUTH0_CLIENT_SECRET"         = azurerm_key_vault_secret.auth0_client_secret.value
    "MICROSOFT_CLIENT_ID"         = azurerm_key_vault_secret.microsoft_client_id.value
    "MICROSOFT_CLIENT_SECRET"     = azurerm_key_vault_secret.microsoft_client_secret.value
    "ZOHO_CLIENT_ID"              = azurerm_key_vault_secret.zoho_client_id.value
    "ZOHO_CLIENT_SECRET"          = azurerm_key_vault_secret.zoho_client_secret.value
    "GOOGLE_CLIENT_ID"            = azurerm_key_vault_secret.google_client_id.value
    "GOOGLE_CLIENT_SECRET"        = azurerm_key_vault_secret.google_client_secret.value
    "LINKEDIN_CLIENT_ID"          = azurerm_key_vault_secret.linkedin_client_id.value
    "LINKEDIN_CLIENT_SECRET"      = azurerm_key_vault_secret.linkedin_client_secret.value
    "FACEBOOK_CLIENT_ID"          = azurerm_key_vault_secret.facebook_client_id.value
    "FACEBOOK_CLIENT_SECRET"      = azurerm_key_vault_secret.facebook_client_secret.value
  }

  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# App Service for Frontend
resource "azurerm_linux_web_app" "frontend" {
  name                = "${var.app_name}-${var.environment}-web"
  resource_group_name = azurerm_resource_group.main.name
  location           = azurerm_service_plan.main.location
  service_plan_id    = azurerm_service_plan.main.id

  site_config {
    application_stack {
      node_version = "18-lts"
    }
  }

  app_settings = {
    "NODE_ENV"        = var.environment
    "NEXT_PUBLIC_API_URL" = "https://${azurerm_linux_web_app.api.default_hostname}"
    "NEXT_PUBLIC_AUTH0_DOMAIN" = azurerm_key_vault_secret.auth0_domain.value
    "NEXT_PUBLIC_AUTH0_CLIENT_ID" = azurerm_key_vault_secret.auth0_client_id.value
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" = azurerm_key_vault_secret.stripe_publishable.value
  }

  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# PostgreSQL Database
resource "azurerm_postgresql_flexible_server" "main" {
  name                   = "${var.app_name}-${var.environment}-db"
  resource_group_name    = azurerm_resource_group.main.name
  location              = azurerm_resource_group.main.location
  version               = "13"
  administrator_login    = "adminuser"
  administrator_password = azurerm_key_vault_secret.db_password.value
  zone                  = "1"

  storage_mb = var.environment == "prod" ? 32768 : 32768
  sku_name   = var.environment == "prod" ? "GP_Standard_D2s_v3" : "GP_Standard_D2s_v3"

  backup_retention_days = 7

  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# PostgreSQL Database
resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "${var.app_name}_db"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Redis Cache
resource "azurerm_redis_cache" "main" {
  name                = "${var.app_name}-${var.environment}-redis"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = var.environment == "prod" ? 1 : 0
  family              = var.environment == "prod" ? "C" : "C"
  sku_name            = var.environment == "prod" ? "Standard" : "Basic"

  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Key Vault
resource "azurerm_key_vault" "main" {
  name                = "${var.app_name}-${var.environment}-kv"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tenant_id           = var.tenant_id
  sku_name            = "standard"

  access_policy {
    tenant_id = var.tenant_id
    object_id = azurerm_user_assigned_identity.main.principal_id

    secret_permissions = [
      "Get",
      "List",
      "Set",
      "Delete",
      "Purge",
      "Recover"
    ]
  }

  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# User Assigned Identity
resource "azurerm_user_assigned_identity" "main" {
  name                = "${var.app_name}-${var.environment}-identity"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Key Vault Secrets
resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret"
  value        = random_password.jwt_secret.result
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  value        = random_password.db_password.result
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "stripe_secret" {
  name         = "stripe-secret-key"
  value        = "sk_test_your_stripe_secret_key"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "stripe_publishable" {
  name         = "stripe-publishable-key"
  value        = "pk_test_your_stripe_publishable_key"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "auth0_domain" {
  name         = "auth0-domain"
  value        = "your-auth0-domain.auth0.com"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "auth0_client_id" {
  name         = "auth0-client-id"
  value        = "your-auth0-client-id"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "auth0_client_secret" {
  name         = "auth0-client-secret"
  value        = "your-auth0-client-secret"
  key_vault_id = azurerm_key_vault.main.id
}

# OAuth Provider Secrets
resource "azurerm_key_vault_secret" "microsoft_client_id" {
  name         = "microsoft-client-id"
  value        = "your-microsoft-client-id"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "microsoft_client_secret" {
  name         = "microsoft-client-secret"
  value        = "your-microsoft-client-secret"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "zoho_client_id" {
  name         = "zoho-client-id"
  value        = "your-zoho-client-id"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "zoho_client_secret" {
  name         = "zoho-client-secret"
  value        = "your-zoho-client-secret"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "google_client_id" {
  name         = "google-client-id"
  value        = "your-google-client-id"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "google_client_secret" {
  name         = "google-client-secret"
  value        = "your-google-client-secret"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "linkedin_client_id" {
  name         = "linkedin-client-id"
  value        = "your-linkedin-client-id"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "linkedin_client_secret" {
  name         = "linkedin-client-secret"
  value        = "your-linkedin-client-secret"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "facebook_client_id" {
  name         = "facebook-client-id"
  value        = "your-facebook-client-id"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "facebook_client_secret" {
  name         = "facebook-client-secret"
  value        = "your-facebook-client-secret"
  key_vault_id = azurerm_key_vault.main.id
}

# Random Passwords
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "${var.app_name}-${var.environment}-insights"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"

  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Storage Account for file uploads
resource "azurerm_storage_account" "main" {
  name                     = "${var.app_name}${var.environment}storage"
  resource_group_name      = azurerm_resource_group.main.name
  location                = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = var.environment == "prod" ? "GRS" : "LRS"

  tags = {
    Environment = var.environment
    Application = var.app_name
  }
}

# Storage Container
resource "azurerm_storage_container" "main" {
  name                  = "uploads"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# Outputs
output "api_url" {
  value = "https://${azurerm_linux_web_app.api.default_hostname}"
}

output "frontend_url" {
  value = "https://${azurerm_linux_web_app.frontend.default_hostname}"
}

output "database_connection_string" {
  value     = azurerm_postgresql_flexible_server.main.connection_string
  sensitive = true
}

output "redis_hostname" {
  value = azurerm_redis_cache.main.hostname
}

output "key_vault_name" {
  value = azurerm_key_vault.main.name
}

output "application_insights_connection_string" {
  value     = azurerm_application_insights.main.connection_string
  sensitive = true
}
