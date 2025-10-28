# Azure Deployment Script for Bigin Webhook Server
# This script helps set up Azure App Service for the webhook server

echo "🚀 Setting up Azure deployment for Bigin Webhook Server..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first:"
    echo "https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if user is logged in to Azure
if ! az account show &> /dev/null; then
    print_warning "You are not logged in to Azure. Please run: az login"
    exit 1
fi

print_status "Azure CLI is installed and you are logged in."

# Set variables
APP_NAME="bigin-webhook-server"
RESOURCE_GROUP="bigin-webhook-rg"
LOCATION="East US"
PLAN_NAME="bigin-webhook-plan"
NODE_VERSION="18-lts"

print_status "Creating Azure resources..."

# Create resource group
print_status "Creating resource group: $RESOURCE_GROUP"
az group create --name $RESOURCE_GROUP --location "$LOCATION"

# Create App Service plan
print_status "Creating App Service plan: $PLAN_NAME"
az appservice plan create \
    --name $PLAN_NAME \
    --resource-group $RESOURCE_GROUP \
    --sku B1 \
    --is-linux

# Create web app
print_status "Creating web app: $APP_NAME"
az webapp create \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --plan $PLAN_NAME \
    --runtime "NODE|18-lts"

# Configure app settings
print_status "Configuring app settings..."
az webapp config appsettings set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
        NODE_ENV=production \
        PORT=8080 \
        WEBSITE_NODE_DEFAULT_VERSION=18.17.0 \
        WEBSITE_RUN_FROM_PACKAGE=1 \
        WEBSITE_ENABLE_SYNC_UPDATE_SITE=true \
        WEBSITE_LOAD_CERTIFICATES="*" \
        LOG_LEVEL=info \
        WEBSITE_SKIP_CONTENTSHARE_VALIDATION=1 \
        WEBSITE_DYNAMIC_CACHE=1 \
        WEBSITE_LOCAL_CACHE_OPTION=Always \
        WEBSITE_AUTH_ENABLED=false \
        WEBSITE_AUTH_REQUIRE_HTTPS=true \
        WEBSITE_HTTPLOGGING_RETENTION_DAYS=7 \
        WEBSITE_LOG_STREAMING_ENABLED=1

# Configure startup command
print_status "Setting startup command..."
az webapp config set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --startup-file "npm start"

# Enable Application Insights
print_status "Enabling Application Insights..."
az monitor app-insights component create \
    --app $APP_NAME \
    --location "$LOCATION" \
    --resource-group $RESOURCE_GROUP \
    --kind web

# Get Application Insights key
APP_INSIGHTS_KEY=$(az monitor app-insights component show \
    --app $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query instrumentationKey \
    --output tsv)

# Add Application Insights to app settings
az webapp config appsettings set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
        APPINSIGHTS_INSTRUMENTATIONKEY=$APP_INSIGHTS_KEY

print_success "Azure App Service created successfully!"
print_status "App URL: https://$APP_NAME.azurewebsites.net"
print_status "Health check: https://$APP_NAME.azurewebsites.net/health"
print_status "Application Insights enabled"

echo ""
print_warning "Next steps:"
echo "1. Set up your Zoho environment variables in Azure Portal:"
echo "   - ZOHO_CLIENT_ID"
echo "   - ZOHO_CLIENT_SECRET" 
echo "   - ZOHO_REFRESH_TOKEN"
echo ""
echo "2. Get the publish profile for GitHub Actions:"
echo "   az webapp deployment list-publishing-profiles --name $APP_NAME --resource-group $RESOURCE_GROUP --xml"
echo ""
echo "3. Add the publish profile as a secret in GitHub:"
echo "   Repository Settings > Secrets > Actions > New repository secret"
echo "   Name: AZUREAPPSERVICE_PUBLISHPROFILE"
echo "   Value: [paste the publish profile content]"
echo ""
echo "4. Push your code to trigger deployment:"
echo "   git add ."
echo "   git commit -m 'Add Azure deployment configuration'"
echo "   git push origin azure-deployment"
echo ""
echo "5. Test your deployment:"
echo "   curl https://$APP_NAME.azurewebsites.net/health"

print_success "Azure setup completed! 🎉"