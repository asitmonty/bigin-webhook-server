# 🚀 Azure Deployment Guide for Bigin Webhook Server

This guide will help you deploy your webhook server to Azure App Service with GitHub integration for seamless CI/CD.

## 📋 Prerequisites

1. **Azure Account** - Sign up at [portal.azure.com](https://portal.azure.com)
2. **Azure CLI** - Install from [docs.microsoft.com](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
3. **GitHub Repository** - Your code should be in GitHub
4. **Zoho Credentials** - Your OAuth credentials

## 🛠️ Step 1: Azure CLI Setup

### Windows (PowerShell):
```powershell
# Install Azure CLI using winget
winget install Microsoft.AzureCLI

# Or download from Microsoft website
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli-windows

# Login to Azure
az login

# Verify login
az account show
```

### macOS/Linux:
```bash
# Install Azure CLI
# macOS: brew install azure-cli
# Linux: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Verify login
az account show
```

## 🏗️ Step 2: Create Azure Resources

### Option A: Using the Deployment Script (Recommended)

#### Windows (PowerShell):
```powershell
# Run the PowerShell deployment script
.\deploy-azure.ps1
```

#### macOS/Linux:
```bash
# Make the script executable
chmod +x deploy-azure.sh

# Run the deployment script
./deploy-azure.sh
```

### Option B: Manual Azure CLI Commands

```bash
# Set variables
APP_NAME="bigin-webhook-server"
RESOURCE_GROUP="bigin-webhook-rg"
LOCATION="East US"
PLAN_NAME="bigin-webhook-plan"

# Create resource group
az group create --name $RESOURCE_GROUP --location "$LOCATION"

# Create App Service plan
az appservice plan create \
    --name $PLAN_NAME \
    --resource-group $RESOURCE_GROUP \
    --sku B1 \
    --is-linux

# Create web app
az webapp create \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --plan $PLAN_NAME \
    --runtime "NODE|18-lts"

# Configure app settings
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

# Enable Application Insights
az monitor app-insights component create \
    --app $APP_NAME \
    --location "$LOCATION" \
    --resource-group $RESOURCE_GROUP \
    --kind web

# Get Application Insights key and add to app settings
APP_INSIGHTS_KEY=$(az monitor app-insights component show \
    --app $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --query instrumentationKey \
    --output tsv)

az webapp config appsettings set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
        APPINSIGHTS_INSTRUMENTATIONKEY=$APP_INSIGHTS_KEY
```

## 🔐 Step 3: Configure Environment Variables

### In Azure Portal:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your App Service
3. Go to **Configuration** > **Application settings**
4. Add the following settings:

| Name | Value | Description |
|------|-------|-------------|
| `ZOHO_CLIENT_ID` | `your_client_id` | Your Zoho OAuth Client ID |
| `ZOHO_CLIENT_SECRET` | `your_client_secret` | Your Zoho OAuth Client Secret |
| `ZOHO_REFRESH_TOKEN` | `your_refresh_token` | Your Zoho OAuth Refresh Token |
| `NODE_ENV` | `production` | Node.js environment |
| `LOG_LEVEL` | `info` | Logging level |
| `PORT` | `8080` | Server port (Azure sets this automatically) |

### Using Azure CLI:

```bash
az webapp config appsettings set \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
        ZOHO_CLIENT_ID="your_client_id" \
        ZOHO_CLIENT_SECRET="your_client_secret" \
        ZOHO_REFRESH_TOKEN="your_refresh_token" \
        NODE_ENV="production" \
        LOG_LEVEL="info"
```

## 🔑 Step 4: Get Publish Profile for GitHub Actions

```bash
# Get the publish profile
az webapp deployment list-publishing-profiles \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --xml
```

Copy the entire XML output.

## 🐙 Step 5: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add the following secret:

| Name | Value |
|------|-------|
| `AZUREAPPSERVICE_PUBLISHPROFILE` | [Paste the XML from Step 4] |

## 📤 Step 6: Deploy to Azure

```bash
# Add Azure deployment files to git
git add .

# Commit the changes
git commit -m "Add Azure deployment configuration"

# Push to trigger deployment
git push origin azure-deployment
```

## ✅ Step 7: Verify Deployment

### Check GitHub Actions:
1. Go to your GitHub repository
2. Click on **Actions** tab
3. Verify the deployment workflow completed successfully

### Test Your Deployment:

#### Health Check:
```bash
curl https://bigin-webhook-server.azurewebsites.net/health
```

#### Readiness Probe:
```bash
curl https://bigin-webhook-server.azurewebsites.net/ready
```

#### Liveness Probe:
```bash
curl https://bigin-webhook-server.azurewebsites.net/live
```

#### Test Webhook Endpoint:
```bash
curl -X POST https://bigin-webhook-server.azurewebsites.net/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 🔗 Your Webhook URLs

Once deployed, your webhook URLs will be:

- **Main Webhook**: `https://bigin-webhook-server.azurewebsites.net/webhook`
- **Legacy Flow**: `https://bigin-webhook-server.azurewebsites.net/flow/webhook/incoming`
- **Health Check**: `https://bigin-webhook-server.azurewebsites.net/health`
- **Readiness Probe**: `https://bigin-webhook-server.azurewebsites.net/ready`
- **Liveness Probe**: `https://bigin-webhook-server.azurewebsites.net/live`
- **Configuration**: `https://bigin-webhook-server.azurewebsites.net/config`

## 🔄 Continuous Deployment

Every time you push to the `azure-deployment` branch, GitHub Actions will automatically:
1. Build your application
2. Run tests
3. Deploy to Azure
4. Verify deployment
5. Run health checks

## 🛠️ Troubleshooting

### Check Logs:
```bash
# View application logs
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP

# Download logs
az webapp log download --name $APP_NAME --resource-group $RESOURCE_GROUP
```

### Common Issues:

1. **Port Issues**: Azure automatically sets `PORT` environment variable to 8080
2. **Node Version**: Ensure you're using Node.js 18.x
3. **Environment Variables**: Double-check all required variables are set
4. **Zoho Rate Limits**: Your server will fallback to simulation mode when rate limited
5. **Application Insights**: Check if instrumentation key is properly set

### Restart App Service:
```bash
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP
```

### Scale App Service:
```bash
# Scale up to S1
az appservice plan update --name $PLAN_NAME --resource-group $RESOURCE_GROUP --sku S1

# Scale out (add instances)
az webapp scale --name $APP_NAME --resource-group $RESOURCE_GROUP --instance-count 3
```

## 📊 Monitoring

### Azure Portal:
- Monitor your app in the Azure Portal
- View metrics, logs, and performance data
- Set up alerts and notifications

### Application Insights:
- Detailed application monitoring
- Performance tracking
- Error tracking and diagnostics
- Custom metrics and events

### Log Analytics:
- Centralized logging
- Advanced querying capabilities
- Integration with other Azure services

## 💰 Cost Optimization

- **App Service Plan**: B1 tier is sufficient for most workloads (~$13/month)
- **Auto-scaling**: Configure based on your needs
- **Resource Groups**: Keep related resources together
- **Application Insights**: Free tier includes 5GB of data per month

## 🔒 Security Best Practices

1. **Environment Variables**: Never commit secrets to code
2. **HTTPS Only**: Azure App Service enforces HTTPS by default
3. **Network Security**: Use Azure Virtual Networks if needed
4. **Access Control**: Implement proper RBAC
5. **Monitoring**: Enable security monitoring and alerts

## 🎉 Success!

Your webhook server is now running on Azure with:

- ✅ Automatic deployments from GitHub
- ✅ Production-ready environment
- ✅ Scalable infrastructure
- ✅ Built-in monitoring with Application Insights
- ✅ SSL certificates
- ✅ Global CDN
- ✅ Health checks and probes
- ✅ Comprehensive logging
- ✅ Error tracking and diagnostics

Your webhook server will now run 24/7 and automatically deploy updates when you push code changes!

## 📞 Support

If you encounter any issues:

1. Check the Azure Portal logs
2. Review GitHub Actions workflow
3. Test endpoints individually
4. Verify environment variables
5. Check Zoho API status

For additional help, refer to:
- [Azure App Service Documentation](https://docs.microsoft.com/en-us/azure/app-service/)
- [Node.js on Azure](https://docs.microsoft.com/en-us/azure/app-service/quickstart-nodejs)
- [Application Insights](https://docs.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
