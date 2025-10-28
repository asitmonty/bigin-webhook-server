# 🚀 Azure Deployment Guide for Bigin Webhook Server

This guide will help you deploy your webhook server to Azure App Service with GitHub integration for seamless CI/CD.

## 📋 Prerequisites

1. **Azure Account** - Sign up at [portal.azure.com](https://portal.azure.com)
2. **Azure CLI** - Install from [docs.microsoft.com](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
3. **GitHub Repository** - Your code should be in GitHub
4. **Zoho Credentials** - Your OAuth credentials

## 🛠️ Step 1: Azure CLI Setup

```bash
# Install Azure CLI (if not already installed)
# Windows: Download from Microsoft website
# macOS: brew install azure-cli
# Linux: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Verify login
az account show
```

## 🏗️ Step 2: Create Azure Resources

### Option A: Using the Deployment Script (Recommended)

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
        WEBSITE_NODE_DEFAULT_VERSION=18.17.0
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
git push origin main
```

## ✅ Step 7: Verify Deployment

### Check GitHub Actions:
1. Go to your GitHub repository
2. Click on **Actions** tab
3. Verify the deployment workflow completed successfully

### Test Your Deployment:
```bash
# Health check
curl https://bigin-webhook-server.azurewebsites.net/health

# Test webhook endpoint
curl -X POST https://bigin-webhook-server.azurewebsites.net/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## 🔗 Your Webhook URLs

Once deployed, your webhook URLs will be:

- **Main Webhook**: `https://bigin-webhook-server.azurewebsites.net/webhook`
- **Legacy Flow**: `https://bigin-webhook-server.azurewebsites.net/flow/webhook/incoming`
- **Health Check**: `https://bigin-webhook-server.azurewebsites.net/health`
- **Configuration**: `https://bigin-webhook-server.azurewebsites.net/config`

## 🔄 Continuous Deployment

Every time you push to the `main` branch, GitHub Actions will automatically:
1. Build your application
2. Run tests
3. Deploy to Azure
4. Verify deployment

## 🛠️ Troubleshooting

### Check Logs:
```bash
# View application logs
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP
```

### Common Issues:

1. **Port Issues**: Azure automatically sets `PORT` environment variable
2. **Node Version**: Ensure you're using Node.js 18.x
3. **Environment Variables**: Double-check all required variables are set
4. **Zoho Rate Limits**: Your server will fallback to simulation mode when rate limited

### Restart App Service:
```bash
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP
```

## 📊 Monitoring

- **Azure Portal**: Monitor your app in the Azure Portal
- **Application Insights**: Enable for detailed monitoring
- **Log Analytics**: View detailed logs and metrics

## 💰 Cost Optimization

- **App Service Plan**: B1 tier is sufficient for most workloads
- **Auto-scaling**: Configure based on your needs
- **Resource Groups**: Keep related resources together

## 🎉 Success!

Your webhook server is now running on Azure with:
- ✅ Automatic deployments from GitHub
- ✅ Production-ready environment
- ✅ Scalable infrastructure
- ✅ Built-in monitoring
- ✅ SSL certificates
- ✅ Global CDN

Your webhook server will now run 24/7 and automatically deploy updates when you push code changes!
