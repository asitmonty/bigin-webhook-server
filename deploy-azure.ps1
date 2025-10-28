# Azure Deployment Script for Bigin Webhook Server (PowerShell)
# This script helps set up Azure App Service for the webhook server on Windows

Write-Host "🚀 Setting up Azure deployment for Bigin Webhook Server..." -ForegroundColor Blue

# Check if Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Azure CLI is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

# Check if user is logged in to Azure
try {
    $account = az account show 2>$null
    if (-not $account) {
        Write-Host "⚠️  You are not logged in to Azure. Please run: az login" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "⚠️  You are not logged in to Azure. Please run: az login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Azure CLI is installed and you are logged in." -ForegroundColor Green

# Set variables
$APP_NAME = "bigin-webhook-server"
$RESOURCE_GROUP = "bigin-webhook-rg"
$LOCATION = "East US"
$PLAN_NAME = "bigin-webhook-plan"
$NODE_VERSION = "18-lts"

Write-Host "📦 Creating Azure resources..." -ForegroundColor Blue

# Create resource group
Write-Host "Creating resource group: $RESOURCE_GROUP" -ForegroundColor Blue
az group create --name $RESOURCE_GROUP --location "$LOCATION"

# Create App Service plan
Write-Host "Creating App Service plan: $PLAN_NAME" -ForegroundColor Blue
az appservice plan create --name $PLAN_NAME --resource-group $RESOURCE_GROUP --sku B1 --is-linux

# Create web app
Write-Host "Creating web app: $APP_NAME" -ForegroundColor Blue
az webapp create --name $APP_NAME --resource-group $RESOURCE_GROUP --plan $PLAN_NAME --runtime "NODE|18-lts"

# Configure app settings
Write-Host "Configuring app settings..." -ForegroundColor Blue
az webapp config appsettings set --name $APP_NAME --resource-group $RESOURCE_GROUP --settings @azure-app-settings.env

# Configure startup command
Write-Host "Setting startup command..." -ForegroundColor Blue
az webapp config set --name $APP_NAME --resource-group $RESOURCE_GROUP --startup-file "npm start"

# Enable Application Insights
Write-Host "Enabling Application Insights..." -ForegroundColor Blue
az monitor app-insights component create --app $APP_NAME --location "$LOCATION" --resource-group $RESOURCE_GROUP --kind web

# Get Application Insights key
$APP_INSIGHTS_KEY = az monitor app-insights component show --app $APP_NAME --resource-group $RESOURCE_GROUP --query instrumentationKey --output tsv

# Add Application Insights to app settings
az webapp config appsettings set --name $APP_NAME --resource-group $RESOURCE_GROUP --settings APPINSIGHTS_INSTRUMENTATIONKEY=$APP_INSIGHTS_KEY

Write-Host "✅ Azure App Service created successfully!" -ForegroundColor Green
Write-Host "🌐 App URL: https://$APP_NAME.azurewebsites.net" -ForegroundColor Cyan
Write-Host "🏥 Health check: https://$APP_NAME.azurewebsites.net/health" -ForegroundColor Cyan
Write-Host "📊 Application Insights enabled" -ForegroundColor Cyan

Write-Host ""
Write-Host "⚠️  Next steps:" -ForegroundColor Yellow
Write-Host "1. Set up your Zoho environment variables in Azure Portal:" -ForegroundColor White
Write-Host "   - ZOHO_CLIENT_ID" -ForegroundColor Gray
Write-Host "   - ZOHO_CLIENT_SECRET" -ForegroundColor Gray
Write-Host "   - ZOHO_REFRESH_TOKEN" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Get the publish profile for GitHub Actions:" -ForegroundColor White
Write-Host "   az webapp deployment list-publishing-profiles --name $APP_NAME --resource-group $RESOURCE_GROUP --xml" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Add the publish profile as a secret in GitHub:" -ForegroundColor White
Write-Host "   Repository Settings > Secrets > Actions > New repository secret" -ForegroundColor Gray
Write-Host "   Name: AZUREAPPSERVICE_PUBLISHPROFILE" -ForegroundColor Gray
Write-Host "   Value: [paste the publish profile content]" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Push your code to trigger deployment:" -ForegroundColor White
Write-Host "   git add ." -ForegroundColor Gray
Write-Host "   git commit -m 'Add Azure deployment configuration'" -ForegroundColor Gray
Write-Host "   git push origin azure-deployment" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Test your deployment:" -ForegroundColor White
Write-Host "   curl https://$APP_NAME.azurewebsites.net/health" -ForegroundColor Gray

Write-Host "🎉 Azure setup completed!" -ForegroundColor Green
