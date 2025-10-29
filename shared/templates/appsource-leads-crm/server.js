// Appsource Leads to CRM - Main Server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Import services
const AuthService = require('./services/AuthService');
const CustomerService = require('./services/CustomerService');
const PaymentService = require('./services/PaymentService');
const SubscriptionService = require('./services/SubscriptionService');
const ReportingService = require('./services/ReportingService');
const SupportService = require('./services/SupportService');
const IntegrationService = require('./services/IntegrationService');
const WebhookService = require('./services/WebhookService');

// Initialize services
const authService = new AuthService();
const customerService = new CustomerService();
const paymentService = new PaymentService();
const subscriptionService = new SubscriptionService();
const reportingService = new ReportingService();
const supportService = new SupportService();
const integrationService = new IntegrationService();
const webhookService = new WebhookService();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'appsource-leads-crm'
  });
});

// Authentication routes
app.use('/api/auth', require('./routes/auth')(authService));

// Customer management routes
app.use('/api/customers', require('./routes/customers')(customerService));

// Payment routes
app.use('/api/payments', require('./routes/payments')(paymentService));

// Subscription routes
app.use('/api/subscriptions', require('./routes/subscriptions')(subscriptionService));

// Reporting routes
app.use('/api/reports', require('./routes/reports')(reportingService));

// Support routes
app.use('/api/support', require('./routes/support')(supportService));

// Integration routes
app.use('/api/integrations', require('./routes/integrations')(integrationService));

// Webhook routes
app.use('/api/webhooks', require('./routes/webhooks')(webhookService));

// Microsoft Appsource specific routes
app.use('/api/appsource', require('./routes/appsource')(integrationService, webhookService));

// Microsoft Partner Center routes
app.use('/api/partner-center', require('./routes/partner-center')(integrationService));

// CRM provisioning routes
app.use('/api/crm', require('./routes/crm')(integrationService));

// Lead enrichment routes
app.use('/api/enrichment', require('./routes/enrichment')(integrationService));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
      timestamp: new Date().toISOString()
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Appsource Leads to CRM server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API documentation: http://localhost:${PORT}/api/docs`);
});

module.exports = app;
