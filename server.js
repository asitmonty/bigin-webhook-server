// Deployment marker: Fixed duplicate PORT declaration - v2.1
const express = require("express");
const bodyParser = require("body-parser");
const { processAndRouteData } = require("./zoho");
const EnhancedDataProcessor = require("./processors/EnhancedDataProcessor");
const ConfigManager = require("./config/ConfigManager");
require("dotenv").config();
const fs = require('fs/promises');
const path = require('path');
const { writeDeadLetterBlob, listDeadLetterBlobs, getDeadLetterBlob, writeEventBlob } = require('./deadletter-blob');
const { BlobServiceClient } = require('@azure/storage-blob');
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const DEADLETTER_CONTAINER = process.env.DEADLETTER_CONTAINER_NAME || 'bigin-deadletters';

async function writeDeadLetter(payload, error, headers) {
  const dir = path.join(__dirname, 'dead_letters');
  const dt = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(36).slice(2, 8);
  const fname = `${dt}-${rand}.json`;
  const obj = { timestamp: new Date().toISOString(), payload, error, headers };
  await fs.writeFile(path.join(dir, fname), JSON.stringify(obj, null, 2));
  console.log('🩸 Dead-letter written:', fname);
}

const app = express();

// Azure App Service configuration
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Configure body parser with Azure-optimized limits
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Azure-specific middleware
app.use((req, res, next) => {
  // Add Azure-specific headers
  res.set('X-Powered-By', 'Azure App Service');
  res.set('X-Environment', NODE_ENV);
  next();
});

// Global security and caching headers
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  // Strong no-cache for API responses
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const axios = require("axios");
const dataProcessor = new EnhancedDataProcessor();
const configManager = new ConfigManager();

// Azure Application Insights integration (if available)
let appInsights = null;
try {
  if (process.env.APPINSIGHTS_INSTRUMENTATIONKEY) {
    appInsights = require('applicationinsights');
    appInsights.setup().start();
    console.log('📊 Application Insights enabled');
  }
} catch (error) {
  console.log('📊 Application Insights not available:', error.message);
}

// Middleware for logging all requests
app.use((req, res, next) => {
  console.log(`\n📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Enhanced health check endpoint for Azure
app.get("/health", (req, res) => {
  const healthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    service: "Zoho Bigin Webhook Processor",
    environment: NODE_ENV,
    port: PORT,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    azure: {
      appService: !!process.env.WEBSITE_SITE_NAME,
      nodeVersion: process.version,
      platform: process.platform
    },
    dependencies: {
      zohoConfigured: !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET),
      appInsights: !!process.env.APPINSIGHTS_INSTRUMENTATIONKEY
    }
  };

  // Log health check for monitoring
  if (appInsights) {
    appInsights.defaultClient.trackEvent({
      name: 'HealthCheck',
      properties: { environment: NODE_ENV, port: PORT }
    });
  }

  res.json(healthCheck);
});

// Azure-specific readiness probe
app.get("/ready", (req, res) => {
  try {
    // Check if all required services are available
    const isReady = !!(
      process.env.ZOHO_CLIENT_ID && 
      process.env.ZOHO_CLIENT_SECRET && 
      dataProcessor && 
      configManager
    );

    if (isReady) {
      res.status(200).json({ 
        status: "ready", 
        timestamp: new Date().toISOString() 
      });
    } else {
      res.status(503).json({ 
        status: "not ready", 
        timestamp: new Date().toISOString(),
        missing: {
          zohoClientId: !process.env.ZOHO_CLIENT_ID,
          zohoClientSecret: !process.env.ZOHO_CLIENT_SECRET,
          dataProcessor: !dataProcessor,
          configManager: !configManager
        }
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: "error", 
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// Azure-specific liveness probe
app.get("/live", (req, res) => {
  res.status(200).json({ 
    status: "alive", 
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime()
  });
});

// Configuration endpoint to view current rules
app.get("/config", (req, res) => {
  try {
    const rules = configManager.getRules();
    res.json({
      success: true,
      rules: rules,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reload configuration endpoint
app.post("/config/reload", (req, res) => {
  try {
    configManager.reloadRules();
    res.json({
      success: true,
      message: "Configuration reloaded successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// --- OAuth callback route ---
app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("❌ No code received from Zoho.");

  try {
    const params = new URLSearchParams({
      code,
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      redirect_uri: "http://localhost:3000/oauth/callback",
      grant_type: "authorization_code",
    });

    const tokenRes = await axios.post(
      "https://accounts.zoho.com/oauth/v2/token",
      params.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token } = tokenRes.data;
    console.log("✅ Access Token:", access_token);
    console.log("🔁 Refresh Token:", refresh_token);

    res.send(`
      <h3>✅ Tokens received successfully!</h3>
      <p><b>Access Token:</b> ${access_token || "(missing)"}</p>
      <p><b>Refresh Token:</b> ${refresh_token || "(missing)"}</p>
      <p>Copy your refresh token into <code>.env</code> as <b>ZOHO_REFRESH_TOKEN</b></p>
    `);
  } catch (err) {
    console.error("OAuth Error:", err.response?.data || err.message);
    res.send("OAuth error — check console logs for details.");
  }
});

// Main webhook endpoint - replaces Zoho Flow webhook
app.post("/webhook", async (req, res) => {
  const payload = req.body;
  console.log("📥 Incoming Webhook Payload:", JSON.stringify(payload, null, 2));

  try {
    // Process the webhook data through our enhanced pipeline
    const processingResult = dataProcessor.processWebhookPayload(payload);
    
    if (!processingResult.success) {
      console.error("❌ Data processing failed:", processingResult.error);
      return res.status(400).json({
        success: false,
        error: processingResult.error,
        message: "Data processing failed"
      });
    }

    // Route the processed data to Zoho Bigin
    const routingOptions = {
      sendToBigin: req.query.sendToBigin !== 'false' // Default: true
    };

    console.log("🚀 Routing options:", routingOptions);
    const routingResults = await processAndRouteData(processingResult.data, routingOptions);

    // Prepare response
    const response = {
      success: true,
      message: "Webhook processed successfully",
      timestamp: new Date().toISOString(),
      processing: {
        extracted: processingResult.data,
        validation: "passed"
      },
      routing: routingResults
    };

    console.log("✅ Webhook processing completed:", JSON.stringify(response, null, 2));
    res.status(200).json(response);

  } catch (err) {
    await writeDeadLetterBlob(req.body, err.message, req.headers);
    await writeEventBlob('fail', { error: err.message, body: req.body, headers: req.headers });
    res.status(500).json({ success: false, error: 'Dead-lettered', message: err.message });
  }
});

// Legacy endpoint for backward compatibility with Zoho Flow webhook URL
app.post("/flow/webhook/incoming", async (req, res) => {
  console.log("🔄 Legacy Zoho Flow webhook endpoint called - redirecting to main webhook");
  
  // Forward to main webhook endpoint
  req.url = '/webhook';
  return app._router.handle(req, res);
});

// Test endpoint for manual testing
app.post("/test", async (req, res) => {
  const testPayload = req.body || {
    name: "Test User",
    email: "test@example.com",
    phone: "+1234567890",
    message: "This is a test message",
    company: "Test Company",
    source: "Manual Test"
  };

  console.log("🧪 Test payload:", JSON.stringify(testPayload, null, 2));

  try {
    const processingResult = dataProcessor.processWebhookPayload(testPayload);
    
    if (!processingResult.success) {
      return res.status(400).json({
        success: false,
        error: processingResult.error,
        testPayload: testPayload
      });
    }

    res.json({
      success: true,
      message: "Test processing completed",
      testPayload: testPayload,
      processedData: processingResult.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      testPayload: testPayload
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("❌ Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: error.message,
    message: "Internal server error"
  });
});

// Admin endpoint: List dead-letter files
app.get('/deadletters', async (req, res) => {
  try {
    const files = await listDeadLetterBlobs();
    res.json({ files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// Admin endpoint: Read a single dead-letter file
app.get('/deadletters/:name', async (req, res) => {
  try {
    const obj = await getDeadLetterBlob(req.params.name);
    res.json(obj);
  } catch (e) {
    res.status(404).json({ error: 'Not found' });
  }
});
// Admin endpoint: Retry a dead-lettered payload by filename
app.post('/deadletters/retry/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const obj = await getDeadLetterBlob(name);
    // Simulate reprocessing: call main processing function as appropriate
    try {
      const EnhancedDataProcessor = require('./processors/EnhancedDataProcessor');
      const processor = new EnhancedDataProcessor();
      const result = await processor.processWebhookPayload(obj.payload);
      if (result.success) {
        // Delete blob after success
        const client = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const container = client.getContainerClient(DEADLETTER_CONTAINER);
        await container.deleteBlob(name);
        await writeEventBlob('retried-success', { name, obj, result });
        return res.json({ success: true, processed: true, deleted: true, result });
      } else {
        await writeEventBlob('retried-fail', { name, obj, result });
        return res.status(400).json({ success: false, error: 'Processing failed again', result });
      }
    } catch (err) {
      await writeEventBlob('retried-fail', { name, obj, error: err.message });
      return res.status(500).json({ success: false, error: err.message });
    }
  } catch (e) {
    res.status(404).json({ error: 'Dead-letter file not found' });
  }
});
// Admin endpoint: Delete a dead-letter by filename
app.post('/deadletters/clear/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const client = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const container = client.getContainerClient(DEADLETTER_CONTAINER);
    await container.deleteBlob(name);
    res.json({ success: true, deleted: name });
  } catch (e) {
    res.status(404).json({ error: 'Dead-letter file not found' });
  }
});

app.get('/analytics/stats', async (req, res) => {
  const { BlobServiceClient } = require('@azure/storage-blob');
  const client = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const container = client.getContainerClient(process.env.DEADLETTER_CONTAINER_NAME || 'bigin-deadletters');
  let success = 0, fail = 0;
  let scanned = 0;
  for await (const blob of container.listBlobsFlat({ prefix: 'analytic-' })) {
    if (blob.name.includes('retried-success')) success++;
    if (blob.name.includes('fail')) fail++;
    scanned++;
    if (scanned > 1000) break;
  }
  res.json({ scanned, success, fail });
});

// Admin HTML UI
app.get('/admin', async (req, res) => {
  try {
    const files = await listDeadLetterBlobs();
    // compute quick stats via existing endpoint logic
    const { BlobServiceClient } = require('@azure/storage-blob');
    const client = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
    const container = client.getContainerClient(process.env.DEADLETTER_CONTAINER_NAME || 'bigin-deadletters');
    let success = 0, fail = 0; let scanned = 0;
    for await (const blob of container.listBlobsFlat({ prefix: 'analytic-' })) {
      if (blob.name.includes('retried-success') || blob.name.includes('success')) success++;
      if (blob.name.includes('fail')) fail++;
      scanned++; if (scanned > 1000) break;
    }

    const rows = files.map(name => `
      <tr>
        <td><code>${name}</code></td>
        <td>
          <form method="get" action="/deadletters/${encodeURIComponent(name)}" style="display:inline">
            <button type="submit">View</button>
          </form>
          <form method="post" action="/deadletters/retry/${encodeURIComponent(name)}" style="display:inline;margin-left:8px">
            <button type="submit">Retry</button>
          </form>
          <form method="post" action="/deadletters/clear/${encodeURIComponent(name)}" style="display:inline;margin-left:8px" onsubmit="return confirm('Delete this dead-letter?')">
            <button type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `).join('');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Webhook Admin</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background: #f7f7f7; text-align: left; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  </style>
</head>
<body>
  <h1>Webhook Admin</h1>
  <section>
    <h2>Analytics</h2>
    <p>Scanned: <b>${scanned}</b> &nbsp; Success: <b>${success}</b> &nbsp; Fail: <b>${fail}</b></p>
  </section>
  <section>
    <h2>Dead Letters (${files.length})</h2>
    <table>
      <thead><tr><th>Blob</th><th>Actions</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="2">None</td></tr>'}</tbody>
    </table>
  </section>
</body>
</html>`;

    res.type('html').send(html);
  } catch (e) {
    res.status(500).send('Admin UI error: ' + e.message);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Standalone Zoho Bigin Webhook Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📊 Log Level: ${LOG_LEVEL}`);
  console.log(`☁️  Azure App Service: ${!!process.env.WEBSITE_SITE_NAME ? 'Yes' : 'No'}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /webhook - Main webhook endpoint (replaces Zoho Flow)`);
  console.log(`   POST /flow/webhook/incoming - Legacy endpoint for backward compatibility`);
  console.log(`   POST /test - Test endpoint`);
  console.log(`   GET /health - Health check (Azure monitoring)`);
  console.log(`   GET /ready - Readiness probe (Azure)`);
  console.log(`   GET /live - Liveness probe (Azure)`);
  console.log(`   GET /config - View configuration`);
  console.log(`   POST /config/reload - Reload configuration`);
  console.log(`   GET /oauth/callback - OAuth callback`);
  console.log(`   GET /deadletters - List dead-letter files`);
  console.log(`   GET /deadletters/:name - Read a single dead-letter file`);
  console.log(`   POST /deadletters/retry/:name - Retry a dead-lettered payload`);
  console.log(`   POST /deadletters/clear/:name - Delete a dead-letter by name`);
  console.log(`   GET /analytics/stats - View analytics stats`);
  console.log(`   GET /admin - Admin UI`);
  
  if (NODE_ENV === 'development') {
    console.log(`\n🔗 Your webhook URL: http://localhost:${PORT}/webhook`);
    console.log(`🔗 Legacy Flow URL: http://localhost:${PORT}/flow/webhook/incoming`);
  } else {
    console.log(`\n🔗 Production webhook URL: https://bigin-webhook-server.azurewebsites.net/webhook`);
    console.log(`🔗 Legacy Flow URL: https://bigin-webhook-server.azurewebsites.net/flow/webhook/incoming`);
  }
});// Deployment trigger
