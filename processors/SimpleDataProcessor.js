const ConfigManager = require('../config/ConfigManager');
const ZohoCRMClient = require('./ZohoCRMClient');

class SimpleDataProcessor {
  constructor() {
    this.configManager = new ConfigManager();
    this.zohoClient = new ZohoCRMClient();
  }

  /**
   * Simple processing method for testing
   */
  async processWebhookPayload(payload) {
    try {
      console.log('🔄 Processing webhook payload:', JSON.stringify(payload, null, 2));

      // Handle nested webhook structure
      let dataSource = payload;
      if (payload.webhookTrigger && payload.webhookTrigger.payload && payload.webhookTrigger.payload.data) {
        dataSource = payload.webhookTrigger.payload.data;
      }

      // Extract basic fields
      const extractedData = {
        name: dataSource.firstName && dataSource.lastName ? `${dataSource.firstName} ${dataSource.lastName}` : dataSource.userName || dataSource.customerName,
        email: dataSource.email || dataSource.customerEmail,
        company: dataSource.company || dataSource.customerCompany,
        source: dataSource.leadSource,
        event_name: payload.webhookTrigger?.payload?.eventName,
        product_name: dataSource.productName,
        deal_amount: dataSource.dealAmount,
        deal_name: dataSource.dealName,
        deal_date: dataSource.dealDate
      };

      console.log('📋 Extracted data:', extractedData);

      // Basic validation
      if (!extractedData.name) {
        throw new Error('Name is required');
      }

      // Handle CRM entities with fallback
      const crmResult = await this.handleCRMEntitiesWithFallback(extractedData);
      console.log('🏢 CRM entities processed:', crmResult);

      // Handle license events
      const licenseResult = this.handleLicenseEvents(extractedData, crmResult);
      console.log('📄 License events processed:', licenseResult);

      // Handle deal management with fallback
      const dealResult = await this.handleDealManagementWithFallback(extractedData, crmResult, licenseResult);
      console.log('💰 Deal management completed:', dealResult);

      return {
        success: true,
        data: {
          ...extractedData,
          crm: crmResult,
          license: licenseResult,
          deal: dealResult
        },
        originalPayload: payload
      };

    } catch (error) {
      console.error('❌ Error processing webhook payload:', error.message);
      return {
        success: false,
        error: error.message,
        originalPayload: payload
      };
    }
  }

  /**
   * Handle CRM entities with fallback to simulation
   */
  async handleCRMEntitiesWithFallback(data) {
    const result = {
      contact: null,
      company: null,
      product: null,
      isNewContact: false,
      isNewCompany: false
    };

    try {
      // Handle Contact
      if (data.email) {
        try {
          let contact = await this.zohoClient.findContactByEmail(data.email);
          
          if (contact) {
            console.log('📞 Found existing contact:', contact.id);
            result.contact = contact;
          } else {
            console.log('👤 Creating new contact...');
            contact = await this.zohoClient.createContact(data);
            result.contact = contact;
            result.isNewContact = true;
          }
        } catch (apiError) {
          console.log('⚠️ CRM API failed, simulating contact:', apiError.message);
          result.contact = { id: 'contact_' + Date.now(), email: data.email, name: data.name };
          result.isNewContact = true;
        }
      }

      // Handle Company
      if (data.company) {
        try {
          let company = await this.zohoClient.findCompanyByName(data.company);
          
          if (company) {
            console.log('🏢 Found existing company:', company.id);
            result.company = company;
          } else {
            console.log('🏢 Creating new company...');
            company = await this.zohoClient.createCompany(data);
            result.company = company;
            result.isNewCompany = true;
          }
        } catch (apiError) {
          console.log('⚠️ CRM API failed, simulating company:', apiError.message);
          result.company = { id: 'company_' + Date.now(), name: data.company };
          result.isNewCompany = true;
        }
      }

      // Handle Product
      if (data.product_name) {
        try {
          let product = await this.zohoClient.findProductByName(data.product_name);
          
          if (product) {
            console.log('📦 Found existing product:', product.id);
            result.product = product;
          } else {
            console.log('📦 Creating new product...');
            product = await this.zohoClient.createProduct(data);
            result.product = product;
          }
        } catch (apiError) {
          console.log('⚠️ CRM API failed, simulating product:', apiError.message);
          result.product = { id: 'product_' + Date.now(), name: data.product_name };
        }
      }

      console.log('✅ CRM entities processed successfully');
    } catch (error) {
      console.error('❌ Error handling CRM entities:', error.message);
    }

    return result;
  }

  /**
   * Handle License Events
   */
  handleLicenseEvents(data, crmResult) {
    const rules = this.configManager.getRules();
    const result = {
      eventType: null,
      stage: null,
      source: null,
      dealName: null
    };

    if (!data.event_name) {
      console.log('⚠️ No event_name provided, skipping license event handling');
      return result;
    }

    const eventName = data.event_name.toLowerCase();
    const licenseRules = rules.licenseEventRules;

    // Determine event type
    if (licenseRules.trialEvents.includes(eventName)) {
      result.eventType = 'trial';
      result.stage = this.determineTrialStage(data, crmResult);
      result.source = this.determineTrialSource(data, crmResult);
    } else if (licenseRules.activationEvents.includes(eventName)) {
      result.eventType = 'activation';
      result.stage = this.determineActivationStage(eventName);
    } else if (licenseRules.purchaseEvents.includes(eventName)) {
      result.eventType = 'purchase';
      result.stage = this.determinePurchaseStage(eventName);
      result.dealName = this.generateDealName(data);
    } else if (licenseRules.purchaseInitiateEvents && licenseRules.purchaseInitiateEvents.includes(eventName)) {
      result.eventType = 'purchaseInitiate';
      result.stage = rules.stageMapping.purchaseInitiate;
    } else if (licenseRules.renewalEvents.includes(eventName)) {
      result.eventType = 'renewal';
      result.stage = rules.stageMapping.renewal;
    } else if (licenseRules.renewalInitiateEvents && licenseRules.renewalInitiateEvents.includes(eventName)) {
      result.eventType = 'renewalInitiate';
      result.stage = rules.stageMapping.renewalInitiate;
    } else if (licenseRules.cancellationEvents.includes(eventName)) {
      result.eventType = 'cancellation';
      result.stage = 'Cancelled';
    }

    console.log('📄 License event processed:', result);
    return result;
  }

  /**
   * Handle Deal Management with fallback
   */
  async handleDealManagementWithFallback(data, crmResult, licenseResult) {
    const result = {
      deal: null,
      isNewDeal: false
    };

    try {
      if (!licenseResult.eventType) {
        console.log('⚠️ No license event type, skipping deal management');
        return result;
      }

      const dealName = licenseResult.dealName || data.deal_name;
      if (!dealName) {
        console.log('⚠️ No deal name available, skipping deal management');
        return result;
      }

      try {
        // Find existing deal
        let deal = await this.zohoClient.findDealByName(dealName);
        
        if (deal) {
          console.log('💰 Found existing deal:', deal.id);
          // Update deal with new stage
          deal = await this.zohoClient.updateDeal(deal.id, {
            ...data,
            deal_name: dealName,
            stage: licenseResult.stage,
            company_id: crmResult.company?.id,
            contact_id: crmResult.contact?.id,
            product_id: crmResult.product?.id
          });
          result.deal = deal;
        } else {
          console.log('💰 Creating new deal...');
          deal = await this.zohoClient.createDeal({
            ...data,
            deal_name: dealName,
            stage: licenseResult.stage,
            company_id: crmResult.company?.id,
            contact_id: crmResult.contact?.id,
            product_id: crmResult.product?.id
          });
          result.deal = deal;
          result.isNewDeal = true;
        }
      } catch (apiError) {
        console.log('⚠️ Deal API failed, simulating deal:', apiError.message);
        result.deal = { id: 'deal_' + Date.now(), name: dealName };
        result.isNewDeal = true;
      }

      console.log('✅ Deal management completed successfully');
    } catch (error) {
      console.error('❌ Error handling deal management:', error.message);
    }

    return result;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Determine trial stage based on contact status and lead source
   */
  determineTrialStage(data, crmResult) {
    const rules = this.configManager.getRules();
    const stageMapping = rules.stageMapping.trial;
    
    if (crmResult.isNewContact) {
      // New contact logic
      if (data.source === 'website' || data.source === 'Website') {
        return stageMapping.newContact.website;
      } else if (data.source === 'MP' || data.source === 'PBI Marketplace' || data.source === 'PowerBI') {
        return stageMapping.newContact.MP;
      }
    } else {
      // Existing contact logic
      if (data.source === 'PBI Marketplace' || data.source === 'PowerBI' || data.source === 'SPZA') {
        return stageMapping.existingContact['PBI Marketplace'];
      } else if (data.source === 'website' || data.source === 'Website') {
        return stageMapping.existingContact.Website;
      }
    }
    
    return stageMapping.newContact.website; // Default fallback
  }

  /**
   * Determine trial source
   */
  determineTrialSource(data, crmResult) {
    const rules = this.configManager.getRules();
    const sourceMapping = rules.sourceMapping;
    
    if (data.source && sourceMapping[data.source]) {
      return sourceMapping[data.source];
    }
    
    return data.source || 'Website'; // Default fallback
  }

  /**
   * Determine activation stage
   */
  determineActivationStage(eventName) {
    const rules = this.configManager.getRules();
    const stageMapping = rules.stageMapping.activation;
    
    return stageMapping[eventName] || 'Trial - Activated'; // Default fallback
  }

  /**
   * Determine purchase stage
   */
  determinePurchaseStage(eventName) {
    const rules = this.configManager.getRules();
    const stageMapping = rules.stageMapping.purchase;
    
    return stageMapping[eventName] || 'Closed Won'; // Default fallback
  }

  /**
   * Generate deal name for purchase events
   */
  generateDealName(data) {
    const rules = this.configManager.getRules();
    const dealNaming = rules.dealNaming;
    
    if (dealNaming.purchase && data.name && data.company) {
      return `${data.name} - ${data.company}`;
    }
    
    return data.deal_name || `${data.name} - ${data.company}`;
  }
}

module.exports = SimpleDataProcessor;
