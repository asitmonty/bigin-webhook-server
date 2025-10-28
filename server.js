const express = require("express");
const bodyParser = require("body-parser");
const { processAndRouteData } = require("./zoho");
const EnhancedDataProcessor = require("./processors/EnhancedDataProcessor");
const ConfigManager = require("./config/ConfigManager");
require("dotenv").config();

const app = express();
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

const axios = require("axios");
const dataProcessor = new EnhancedDataProcessor();
const configManager = new ConfigManager();

// Middleware for logging all requests
app.use((req, res, next) => {
  console.log(`\n📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    service: "Zoho Bigin Webhook Processor"
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

  } catch (error) {
    console.error("❌ Error processing webhook:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Internal server error",
      timestamp: new Date().toISOString()
    });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Standalone Zoho Bigin Webhook Server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /webhook - Main webhook endpoint (replaces Zoho Flow)`);
  console.log(`   POST /flow/webhook/incoming - Legacy endpoint for backward compatibility`);
  console.log(`   POST /test - Test endpoint`);
  console.log(`   GET /health - Health check`);
  console.log(`   GET /config - View configuration`);
  console.log(`   POST /config/reload - Reload configuration`);
  console.log(`   GET /oauth/callback - OAuth callback`);
  console.log(`\n🔗 Your webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`🔗 Legacy Flow URL: http://localhost:${PORT}/flow/webhook/incoming`);
});