# Standalone Zoho Bigin Webhook Server

A comprehensive webhook processing utility that replaces Zoho Flow and directly integrates with Zoho Bigin. This server accepts webhook data, processes it according to configurable rules, and writes records directly to Zoho Bigin.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy the environment template and fill in your Zoho credentials:
```bash
cp env.template .env
```

Edit `.env` with your Zoho OAuth credentials:
```env
ZOHO_CLIENT_ID=your_client_id_here
ZOHO_CLIENT_SECRET=your_client_secret_here
ZOHO_REFRESH_TOKEN=your_refresh_token_here
PORT=3000
```

### 3. Set up Zoho OAuth
1. Visit `http://localhost:3000/oauth/callback` to get your tokens
2. Copy the refresh token to your `.env` file

### 4. Start the Server
```bash
npm start
```

## 🔗 Webhook URLs

Your webhook server provides these endpoints:

- **Main Webhook**: `http://localhost:3000/webhook`
- **Legacy Flow URL**: `http://localhost:3000/flow/webhook/incoming` (for backward compatibility)
- **Test Endpoint**: `http://localhost:3000/test`

## 📋 API Endpoints

### Main Webhook Endpoint
```
POST /webhook
```
**Replaces your Zoho Flow webhook** - accepts webhook data and processes it through the complete pipeline.

**Query Parameters:**
- `sendToBigin=true/false` - Send to Zoho Bigin (default: true)

**Example Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890",
  "message": "Interested in your services",
  "company": "Acme Corp",
  "website": "acme.com"
}
```

### Legacy Endpoint (Backward Compatibility)
```
POST /flow/webhook/incoming
```
Maintains compatibility with existing integrations that might still reference the old Zoho Flow URL.

### Test Endpoint
```
POST /test
```
Test the data processing pipeline without sending to external services.

### Health Check
```
GET /health
```
Returns server status and version information.

### Configuration Management
```
GET /config - View current configuration rules
POST /config/reload - Reload configuration from file
```

## ⚙️ Configuration

The system uses `config/rules.json` for configuration. Key sections:

### Field Mappings
Define how webhook fields map to internal fields:
```json
{
  "fieldMappings": {
    "name": ["name", "Name", "full_name", "Full_Name", "customer_name"],
    "email": ["email", "Email", "email_address", "Email_Address"],
    "phone": ["phone", "Phone", "mobile", "Mobile"],
    "website": ["website", "Website", "url", "URL"]
  }
}
```

### Validation Rules
Set validation requirements:
```json
{
  "validationRules": {
    "email": {
      "required": false,
      "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
    },
    "name": {
      "required": true,
      "minLength": 2
    }
  }
}
```

### Transformation Rules
Define data transformations:
```json
{
  "transformationRules": {
    "phone": {
      "removeSpaces": true,
      "removeSpecialChars": true,
      "addCountryCode": "+1"
    },
    "website": {
      "toLowerCase": true,
      "addProtocol": "https"
    }
  }
}
```

### Zoho Field Mappings
Map internal fields to Zoho Bigin fields:
```json
{
  "zohoFieldMappings": {
    "Last_Name": "name",
    "Email": "email",
    "Mobile": "phone",
    "Description": "message",
    "Company": "company",
    "Website": "website"
  }
}
```

## 🔄 Migration from Zoho Flow

### Step 1: Deploy Your Webhook Server
1. Deploy this server to your preferred hosting platform (Heroku, AWS, DigitalOcean, etc.)
2. Update your webhook URLs to point to your new server

### Step 2: Update External Integrations
Replace your Zoho Flow webhook URL:
```
OLD: https://flow.zoho.com/732778874/flow/webhook/incoming?zapikey=...
NEW: https://your-domain.com/webhook
```

### Step 3: Test the Migration
1. Use the `/test` endpoint to verify data processing
2. Send test webhooks to ensure everything works
3. Monitor logs for any issues

## 🚀 Deployment Options

### Heroku
```bash
# Create Heroku app
heroku create your-webhook-app

# Set environment variables
heroku config:set ZOHO_CLIENT_ID=your_client_id
heroku config:set ZOHO_CLIENT_SECRET=your_client_secret
heroku config:set ZOHO_REFRESH_TOKEN=your_refresh_token

# Deploy
git push heroku main
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### PM2 (Production)
```bash
npm install -g pm2
pm2 start server.js --name "webhook-server"
pm2 startup
pm2 save
```

## 📊 Monitoring & Logging

The server provides comprehensive logging:
- Request/response logging
- Data processing steps
- Zoho API interactions
- Error handling with detailed messages

## 🔧 Customization

### Adding New Field Types
1. Update `config/rules.json` with new field mappings
2. Add validation rules if needed
3. Define transformation rules
4. Map to Zoho fields
5. Reload configuration via `/config/reload`

### Custom Validation Rules
Add custom validation patterns:
```json
{
  "validationRules": {
    "custom_field": {
      "required": true,
      "pattern": "^[A-Z]{2}[0-9]{4}$",
      "message": "Must be 2 letters followed by 4 numbers"
    }
  }
}
```

## 🛠️ Development

### Project Structure
```
bigin-webhook-server/
├── config/
│   ├── ConfigManager.js    # Configuration management
│   └── rules.json          # Processing rules
├── processors/
│   └── DataProcessor.js    # Data processing logic
├── server.js               # Main server file
├── zoho.js                # Zoho Bigin API integration
├── package.json           # Dependencies
└── env.template           # Environment template
```

### Testing
Use the `/test` endpoint to test data processing:
```bash
curl -X POST http://localhost:3000/test \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","website":"example.com"}'
```

## 🔐 Security

- Environment variables for sensitive data
- Input validation and sanitization
- Error handling without exposing internal details
- Optional webhook secret validation (can be added)

## 📈 Performance

- Efficient data processing pipeline
- Automatic token refresh for Zoho API
- Comprehensive error handling
- Request/response logging for monitoring

## 🆘 Troubleshooting

### Common Issues

1. **OAuth Token Issues**
   - Visit `/oauth/callback` to refresh tokens
   - Check environment variables

2. **Data Processing Errors**
   - Check `/config` endpoint for current rules
   - Use `/test` endpoint to debug processing

3. **Zoho API Errors**
   - Check logs for detailed error messages
   - Verify API credentials and permissions

### Support
Check the logs for detailed error information. The server provides comprehensive logging for debugging.

## License

MIT License