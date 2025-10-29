// Microsoft Appsource Integration Service
const axios = require('axios');
const crypto = require('crypto');
const IntegrationManager = require('../../../integrations/IntegrationManager');

class AppsourceIntegrationService {
  constructor() {
    this.integrationManager = new IntegrationManager();
    this.baseUrl = 'https://appsource.microsoft.com/api';
  }

  // Process Appsource webhook payload
  async processAppsourceWebhook(payload, tenantId) {
    try {
      // Validate webhook signature
      const isValid = await this.validateWebhookSignature(payload);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Extract lead data from Appsource payload
      const leadData = this.extractLeadData(payload);
      
      // Enrich lead data
      const enrichedLead = await this.enrichLeadData(leadData);
      
      // Store lead in database
      const storedLead = await this.storeLead(enrichedLead, tenantId);
      
      // Send to CRM integrations
      await this.sendToCRMIntegrations(storedLead, tenantId);
      
      // Update analytics
      await this.updateAnalytics(tenantId, 'lead_received');
      
      return {
        success: true,
        leadId: storedLead.id,
        message: 'Lead processed successfully'
      };
      
    } catch (error) {
      console.error('Error processing Appsource webhook:', error);
      throw error;
    }
  }

  // Extract lead data from Appsource webhook payload
  extractLeadData(payload) {
    return {
      firstName: payload.firstName || '',
      lastName: payload.lastName || '',
      email: payload.email || '',
      company: payload.company || '',
      phone: payload.phone || '',
      country: payload.country || '',
      state: payload.state || '',
      city: payload.city || '',
      jobTitle: payload.jobTitle || '',
      industry: payload.industry || '',
      companySize: payload.companySize || '',
      source: 'Microsoft Appsource',
      sourceId: payload.subscriptionId || '',
      downloadDate: new Date(payload.downloadDate || Date.now()),
      appName: payload.appName || '',
      appId: payload.appId || '',
      publisherId: payload.publisherId || '',
      metadata: {
        originalPayload: payload,
        processedAt: new Date()
      }
    };
  }

  // Enrich lead data from public sources
  async enrichLeadData(leadData) {
    try {
      const enrichedData = { ...leadData };
      
      // Enrich company information
      if (leadData.company) {
        const companyInfo = await this.enrichCompanyInfo(leadData.company);
        enrichedData.companyInfo = companyInfo;
      }
      
      // Enrich contact information from LinkedIn (if available)
      if (leadData.email) {
        const contactInfo = await this.enrichContactInfo(leadData.email);
        enrichedData.contactInfo = contactInfo;
      }
      
      // Add lead score
      enrichedData.leadScore = this.calculateLeadScore(enrichedData);
      
      // Add enrichment timestamp
      enrichedData.enrichedAt = new Date();
      
      return enrichedData;
      
    } catch (error) {
      console.error('Error enriching lead data:', error);
      return leadData; // Return original data if enrichment fails
    }
  }

  // Enrich company information
  async enrichCompanyInfo(companyName) {
    try {
      // This would integrate with company data APIs
      // For now, return mock data
      return {
        industry: 'Technology',
        companySize: '50-200',
        revenue: '$1M-$10M',
        foundedYear: 2015,
        website: `https://${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
        socialMedia: {
          linkedin: `https://linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
          twitter: `https://twitter.com/${companyName.toLowerCase().replace(/\s+/g, '')}`
        },
        technologies: ['Microsoft Azure', 'Office 365', 'Power Platform'],
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error enriching company info:', error);
      return null;
    }
  }

  // Enrich contact information
  async enrichContactInfo(email) {
    try {
      // This would integrate with contact enrichment APIs
      // For now, return mock data
      return {
        socialProfiles: {
          linkedin: `https://linkedin.com/in/${email.split('@')[0]}`,
          twitter: `https://twitter.com/${email.split('@')[0]}`
        },
        verified: true,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error enriching contact info:', error);
      return null;
    }
  }

  // Calculate lead score based on available data
  calculateLeadScore(leadData) {
    let score = 0;
    
    // Base score
    score += 10;
    
    // Email domain score
    if (leadData.email) {
      const domain = leadData.email.split('@')[1];
      if (this.isBusinessEmail(domain)) {
        score += 20;
      }
    }
    
    // Company size score
    if (leadData.companySize) {
      const size = leadData.companySize.toLowerCase();
      if (size.includes('enterprise') || size.includes('1000+')) {
        score += 30;
      } else if (size.includes('500') || size.includes('1000')) {
        score += 20;
      } else if (size.includes('100') || size.includes('500')) {
        score += 10;
      }
    }
    
    // Industry score
    if (leadData.industry) {
      const highValueIndustries = ['technology', 'software', 'finance', 'healthcare'];
      if (highValueIndustries.some(industry => 
        leadData.industry.toLowerCase().includes(industry))) {
        score += 15;
      }
    }
    
    // Job title score
    if (leadData.jobTitle) {
      const decisionMakerTitles = ['ceo', 'cto', 'vp', 'director', 'manager'];
      if (decisionMakerTitles.some(title => 
        leadData.jobTitle.toLowerCase().includes(title))) {
        score += 25;
      }
    }
    
    // Enrichment bonus
    if (leadData.companyInfo || leadData.contactInfo) {
      score += 10;
    }
    
    return Math.min(score, 100); // Cap at 100
  }

  // Check if email domain is business email
  isBusinessEmail(domain) {
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    return !personalDomains.includes(domain.toLowerCase());
  }

  // Store lead in database
  async storeLead(leadData, tenantId) {
    // This would integrate with the database service
    // For now, return mock data
    return {
      id: crypto.randomUUID(),
      tenantId,
      ...leadData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Send lead to CRM integrations
  async sendToCRMIntegrations(leadData, tenantId) {
    try {
      // Get active CRM integrations for tenant
      const crmIntegrations = await this.getActiveCRMIntegrations(tenantId);
      
      const results = [];
      
      for (const integration of crmIntegrations) {
        try {
          const result = await this.sendLeadToCRM(leadData, integration);
          results.push({
            integrationId: integration.id,
            success: true,
            result
          });
        } catch (error) {
          results.push({
            integrationId: integration.id,
            success: false,
            error: error.message
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Error sending to CRM integrations:', error);
      throw error;
    }
  }

  // Get active CRM integrations for tenant
  async getActiveCRMIntegrations(tenantId) {
    // This would query the database for active CRM integrations
    // For now, return mock data
    return [
      {
        id: 'zoho-crm',
        type: 'zoho-crm',
        credentials: {
          accessToken: 'mock_access_token'
        }
      },
      {
        id: 'salesforce',
        type: 'salesforce',
        credentials: {
          accessToken: 'mock_access_token'
        }
      }
    ];
  }

  // Send lead to specific CRM
  async sendLeadToCRM(leadData, integration) {
    const integrationManager = this.integrationManager;
    
    // Transform lead data for CRM
    const crmLeadData = this.transformLeadForCRM(leadData, integration.type);
    
    // Send to CRM
    const result = await integrationManager.createLead(
      integration.type,
      crmLeadData,
      integration.credentials.accessToken
    );
    
    return result;
  }

  // Transform lead data for specific CRM
  transformLeadForCRM(leadData, crmType) {
    const transformations = {
      'zoho-crm': {
        First_Name: leadData.firstName,
        Last_Name: leadData.lastName,
        Email: leadData.email,
        Phone: leadData.phone,
        Company: leadData.company,
        Lead_Source: leadData.source,
        Industry: leadData.industry,
        Lead_Status: 'Not Contacted',
        Description: `Lead from Microsoft Appsource - ${leadData.appName}`
      },
      'salesforce': {
        FirstName: leadData.firstName,
        LastName: leadData.lastName,
        Email: leadData.email,
        Phone: leadData.phone,
        Company: leadData.company,
        LeadSource: leadData.source,
        Industry: leadData.industry,
        Status: 'Open - Not Contacted',
        Description: `Lead from Microsoft Appsource - ${leadData.appName}`
      },
      'zoho-bigin': {
        First_Name: leadData.firstName,
        Last_Name: leadData.lastName,
        Email: leadData.email,
        Phone: leadData.phone,
        Company: leadData.company,
        Lead_Source: leadData.source,
        Industry: leadData.industry,
        Lead_Status: 'Not Contacted',
        Description: `Lead from Microsoft Appsource - ${leadData.appName}`
      }
    };
    
    return transformations[crmType] || leadData;
  }

  // Validate webhook signature
  async validateWebhookSignature(payload) {
    // This would validate the webhook signature from Microsoft Appsource
    // For now, return true for development
    return true;
  }

  // Update analytics
  async updateAnalytics(tenantId, event) {
    // This would update analytics data
    console.log(`Analytics update: ${event} for tenant ${tenantId}`);
  }

  // Get historical data from Microsoft Partner Center
  async getHistoricalDataFromPartnerCenter(tenantId, publisherId) {
    try {
      const integration = this.integrationManager.getIntegration('microsoft-partner-center');
      if (!integration) {
        throw new Error('Microsoft Partner Center integration not configured');
      }
      
      // Get leads from Partner Center
      const leads = await this.integrationManager.makeApiCall(
        'microsoft-partner-center',
        '/v1/leads',
        'GET',
        null,
        'mock_access_token'
      );
      
      // Process historical leads
      const processedLeads = leads.map(lead => this.extractLeadData(lead));
      
      return {
        success: true,
        leads: processedLeads,
        count: processedLeads.length
      };
      
    } catch (error) {
      console.error('Error getting historical data:', error);
      throw error;
    }
  }
}

module.exports = AppsourceIntegrationService;
