// Microsoft Appsource Routes
const express = require('express');
const { body, validationResult } = require('express-validator');

const router = express.Router();

module.exports = (appsourceService, webhookService) => {
  
  // Webhook endpoint for Microsoft Appsource
  router.post('/webhook', [
    body('subscriptionId').notEmpty().withMessage('Subscription ID is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required')
  ], async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      // Extract tenant ID from headers or subdomain
      const tenantId = req.headers['x-tenant-id'] || req.subdomain;
      if (!tenantId) {
        return res.status(400).json({
          error: {
            message: 'Tenant ID is required'
          }
        });
      }

      // Process webhook
      const result = await appsourceService.processAppsourceWebhook(req.body, tenantId);
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('Appsource webhook error:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Internal server error'
        }
      });
    }
  });

  // Get leads for tenant
  router.get('/leads', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.subdomain;
      if (!tenantId) {
        return res.status(400).json({
          error: {
            message: 'Tenant ID is required'
          }
        });
      }

      const { page = 1, limit = 20, source, status, dateFrom, dateTo } = req.query;
      
      // This would query the database for leads
      const leads = await appsourceService.getLeads(tenantId, {
        page: parseInt(page),
        limit: parseInt(limit),
        source,
        status,
        dateFrom,
        dateTo
      });
      
      res.json({
        success: true,
        data: leads
      });
      
    } catch (error) {
      console.error('Get leads error:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Internal server error'
        }
      });
    }
  });

  // Get lead by ID
  router.get('/leads/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.subdomain;
      
      const lead = await appsourceService.getLeadById(id, tenantId);
      
      if (!lead) {
        return res.status(404).json({
          error: {
            message: 'Lead not found'
          }
        });
      }
      
      res.json({
        success: true,
        data: lead
      });
      
    } catch (error) {
      console.error('Get lead error:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Internal server error'
        }
      });
    }
  });

  // Update lead
  router.put('/leads/:id', [
    body('status').optional().isIn(['new', 'contacted', 'qualified', 'unqualified']),
    body('notes').optional().isString()
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] || req.subdomain;
      
      const updatedLead = await appsourceService.updateLead(id, req.body, tenantId);
      
      res.json({
        success: true,
        data: updatedLead
      });
      
    } catch (error) {
      console.error('Update lead error:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Internal server error'
        }
      });
    }
  });

  // Get lead analytics
  router.get('/analytics', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.subdomain;
      const { period = '30d' } = req.query;
      
      const analytics = await appsourceService.getLeadAnalytics(tenantId, period);
      
      res.json({
        success: true,
        data: analytics
      });
      
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Internal server error'
        }
      });
    }
  });

  // Sync historical data from Partner Center
  router.post('/sync-historical', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.subdomain;
      const { publisherId } = req.body;
      
      if (!publisherId) {
        return res.status(400).json({
          error: {
            message: 'Publisher ID is required'
          }
        });
      }
      
      const result = await appsourceService.getHistoricalDataFromPartnerCenter(tenantId, publisherId);
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('Sync historical data error:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Internal server error'
        }
      });
    }
  });

  // Get webhook configuration
  router.get('/webhook-config', async (req, res) => {
    try {
      const tenantId = req.headers['x-tenant-id'] || req.subdomain;
      
      const webhookConfig = await webhookService.getWebhookConfig(tenantId, 'appsource');
      
      res.json({
        success: true,
        data: webhookConfig
      });
      
    } catch (error) {
      console.error('Get webhook config error:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Internal server error'
        }
      });
    }
  });

  // Update webhook configuration
  router.put('/webhook-config', [
    body('url').isURL().withMessage('Valid webhook URL is required'),
    body('events').isArray().withMessage('Events must be an array'),
    body('secret').optional().isString()
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const tenantId = req.headers['x-tenant-id'] || req.subdomain;
      
      const webhookConfig = await webhookService.updateWebhookConfig(tenantId, 'appsource', req.body);
      
      res.json({
        success: true,
        data: webhookConfig
      });
      
    } catch (error) {
      console.error('Update webhook config error:', error);
      res.status(500).json({
        error: {
          message: error.message || 'Internal server error'
        }
      });
    }
  });

  return router;
};
