# 🚀 Azure Deployment Best Practices Guide
## Based on Real Deployment Experience

This guide captures lessons learned from multiple Azure deployments to ensure smooth, reliable deployments every time.

## ✅ **What TO Do - Best Practices**

### 1. **Pre-Deployment Checklist**
- [ ] **Test locally first** - Always test the complete system locally before deploying
- [ ] **Verify environment variables** - Ensure all required variables are documented
- [ ] **Check rate limits** - Verify Zoho API rate limits are respected
- [ ] **Clean codebase** - Remove debug files, test files, and unnecessary logs
- [ ] **Update documentation** - Keep README and deployment docs current

### 2. **Azure Resource Management**
- [ ] **Use consistent naming** - Stick to naming conventions (e.g., `bigin-webhook-server`)
- [ ] **Resource group organization** - Keep related resources in same resource group
- [ ] **App Service Plan sizing** - Start with B1, scale up as needed
- [ ] **Location consistency** - Use same region for all resources (East US)

### 3. **Environment Variables Setup**
```bash
# Set variables individually to avoid "Bad Request" errors
az webapp config appsettings set \
  --name bigin-webhook-server \
  --resource-group bigin-webhook-rg \
  --settings NODE_ENV=production PORT=8080 LOG_LEVEL=info

# Then add Zoho credentials
az webapp config appsettings set \
  --name bigin-webhook-server \
  --resource-group bigin-webhook-rg \
  --settings ZOHO_CLIENT_ID=your_id ZOHO_CLIENT_SECRET=your_secret ZOHO_REFRESH_TOKEN=your_token
```

### 4. **GitHub Actions Configuration**
- [ ] **Publish profile secret** - Always add `AZUREAPPSERVICE_PUBLISHPROFILE` secret
- [ ] **Workflow triggers** - Use both `main` and `azure-deployment` branches
- [ ] **Health checks** - Include comprehensive health checks in workflow
- [ ] **Error handling** - Add proper error handling and rollback mechanisms

### 5. **Code Quality Standards**
- [ ] **Remove large files** - Avoid files >50MB (use Git LFS if needed)
- [ ] **Clean commits** - Use descriptive commit messages
- [ ] **Branch strategy** - Use feature branches, merge to main for deployment
- [ ] **Test coverage** - Include tests in GitHub Actions workflow

## ❌ **What NOT To Do - Common Pitfalls**

### 1. **Environment Variable Mistakes**
- ❌ **Don't set all variables at once** - Causes "Bad Request" errors
- ❌ **Don't use quotes in values** - Azure CLI handles this automatically
- ❌ **Don't commit secrets** - Never commit .env files with real credentials
- ❌ **Don't mix environments** - Keep dev/staging/prod variables separate

### 2. **Azure CLI Issues**
- ❌ **Don't ignore Azure CLI warnings** - Update CLI regularly
- ❌ **Don't skip login verification** - Always verify `az account show`
- ❌ **Don't use deprecated commands** - Use latest Azure CLI syntax
- ❌ **Don't ignore resource conflicts** - Check for existing resources first

### 3. **GitHub Actions Problems**
- ❌ **Don't skip publish profile** - Deployment will fail without it
- ❌ **Don't ignore workflow failures** - Fix issues before merging
- ❌ **Don't use hardcoded URLs** - Use environment variables for URLs
- ❌ **Don't skip health checks** - Always verify deployment success

### 4. **Code Deployment Issues**
- ❌ **Don't deploy untested code** - Always test locally first
- ❌ **Don't ignore rate limits** - Respect Zoho API limits
- ❌ **Don't leave debug code** - Remove console.logs and debug statements
- ❌ **Don't skip error handling** - Add proper try-catch blocks

## 🔧 **Step-by-Step Deployment Process**

### **Phase 1: Preparation**
```bash
# 1. Verify Azure CLI
az --version
az account show

# 2. Test locally
npm test
npm start

# 3. Clean codebase
git add .
git commit -m "Clean codebase for deployment"
```

### **Phase 2: Azure Setup**
```bash
# 1. Create resources (if not exists)
az group create --name bigin-webhook-rg --location "East US"
az appservice plan create --name bigin-webhook-plan --resource-group bigin-webhook-rg --sku B1 --is-linux
az webapp create --name bigin-webhook-server --resource-group bigin-webhook-rg --plan bigin-webhook-plan --runtime "NODE|18-lts"

# 2. Set environment variables (one by one)
az webapp config appsettings set --name bigin-webhook-server --resource-group bigin-webhook-rg --settings NODE_ENV=production
az webapp config appsettings set --name bigin-webhook-server --resource-group bigin-webhook-rg --settings PORT=8080
az webapp config appsettings set --name bigin-webhook-server --resource-group bigin-webhook-rg --settings LOG_LEVEL=info

# 3. Enable Application Insights
az monitor app-insights component create --app bigin-webhook-server --location "East US" --resource-group bigin-webhook-rg --kind web
```

### **Phase 3: GitHub Configuration**
```bash
# 1. Get publish profile
az webapp deployment list-publishing-profiles --name bigin-webhook-server --resource-group bigin-webhook-rg --xml

# 2. Add to GitHub Secrets:
# - Go to GitHub Repository Settings
# - Secrets and variables > Actions
# - New repository secret: AZUREAPPSERVICE_PUBLISHPROFILE
# - Paste the XML content
```

### **Phase 4: Deployment**
```bash
# 1. Push to trigger deployment
git push origin main

# 2. Monitor deployment
# - Check GitHub Actions tab
# - Monitor Azure App Service logs
# - Verify health checks
```

### **Phase 5: Verification**
```bash
# 1. Health check
curl https://bigin-webhook-server.azurewebsites.net/health

# 2. Test webhook
curl -X POST https://bigin-webhook-server.azurewebsites.net/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "deployment verification"}'

# 3. Check logs
az webapp log tail --name bigin-webhook-server --resource-group bigin-webhook-rg
```

## 🚨 **Troubleshooting Common Issues**

### **Issue: "Bad Request" Error**
**Cause:** Setting too many environment variables at once
**Solution:** Set variables individually
```bash
az webapp config appsettings set --name APP_NAME --resource-group RG_NAME --settings KEY1=value1
az webapp config appsettings set --name APP_NAME --resource-group RG_NAME --settings KEY2=value2
```

### **Issue: GitHub Actions Deployment Fails**
**Cause:** Missing or incorrect publish profile
**Solution:** 
1. Regenerate publish profile
2. Update GitHub secret
3. Check workflow syntax

### **Issue: Health Check Fails**
**Cause:** Application not starting properly
**Solution:**
1. Check application logs
2. Verify environment variables
3. Test locally first

### **Issue: Zoho API Errors**
**Cause:** Rate limiting or invalid credentials
**Solution:**
1. Check rate limit status
2. Verify refresh token validity
3. Implement proper token management

## 📊 **Monitoring and Maintenance**

### **Regular Checks**
- [ ] **Weekly:** Review Azure App Service metrics
- [ ] **Monthly:** Check Application Insights reports
- [ ] **Quarterly:** Review and update dependencies
- [ ] **As needed:** Monitor Zoho API usage and limits

### **Scaling Considerations**
```bash
# Scale up App Service Plan
az appservice plan update --name bigin-webhook-plan --resource-group bigin-webhook-rg --sku S1

# Scale out (add instances)
az webapp scale --name bigin-webhook-server --resource-group bigin-webhook-rg --instance-count 3
```

## 🎯 **Success Metrics**

### **Deployment Success Indicators**
- ✅ Health check returns 200 OK
- ✅ All environment variables properly set
- ✅ Application Insights receiving data
- ✅ GitHub Actions workflow completes successfully
- ✅ Webhook endpoint responds correctly

### **Performance Benchmarks**
- **Startup time:** < 30 seconds
- **Response time:** < 2 seconds
- **Uptime:** > 99.9%
- **Error rate:** < 0.1%

## 📝 **Deployment Checklist Template**

### **Pre-Deployment**
- [ ] Code tested locally
- [ ] Environment variables documented
- [ ] Dependencies updated
- [ ] Debug code removed
- [ ] Documentation updated

### **Azure Setup**
- [ ] Resource group exists
- [ ] App Service Plan configured
- [ ] Web App created
- [ ] Environment variables set
- [ ] Application Insights enabled

### **GitHub Configuration**
- [ ] Publish profile added as secret
- [ ] Workflow file updated
- [ ] Branch protection rules set
- [ ] Required status checks enabled

### **Post-Deployment**
- [ ] Health check passes
- [ ] Webhook endpoint tested
- [ ] Logs monitored
- [ ] Performance verified
- [ ] Team notified

## 🔄 **Continuous Improvement**

### **After Each Deployment**
1. **Document issues** encountered
2. **Update this guide** with new learnings
3. **Share knowledge** with team
4. **Improve automation** where possible
5. **Plan next optimizations**

---

## 📞 **Emergency Procedures**

### **Rollback Process**
```bash
# 1. Stop current deployment
az webapp stop --name bigin-webhook-server --resource-group bigin-webhook-rg

# 2. Deploy previous version
az webapp deployment source config-zip --name bigin-webhook-server --resource-group bigin-webhook-rg --src previous-version.zip

# 3. Restart application
az webapp start --name bigin-webhook-server --resource-group bigin-webhook-rg
```

### **Emergency Contacts**
- **Azure Support:** Azure Portal → Help + Support
- **GitHub Support:** GitHub Support Portal
- **Team Lead:** [Your contact info]

---

**Last Updated:** October 28, 2025  
**Version:** 1.0  
**Author:** AI Assistant based on real deployment experience
