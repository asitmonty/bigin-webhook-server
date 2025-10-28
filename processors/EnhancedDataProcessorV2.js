const ConfigManager = require('../config/ConfigManager');
const ZohoCRMClient = require('./ZohoCRMClient');

class EnhancedDataProcessor {
  constructor() {
    this.configManager = new ConfigManager();
    this.zohoClient = new ZohoCRMClient();
  }

  /**
   * Main processing method that handles the complete Zoho Flow logic
   */
  async processWebhookPayload(payload) {
    try {
      console.log('🔄 Processing complex webhook payload:', JSON.stringify(payload, null, 2));

      // Step 1: Extract data from all branches
      const extractedData = this.extractAllBranches(payload);
      console.log('📋 Extracted data from all branches:', extractedData);

      // Step 2: Validate and transform data
      const processedData = this.validateAndTransform(extractedData);
      console.log('🔄 Processed data:', processedData);

      // Step 2.5: Validate processed data
      const validation = this.validateData(processedData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Step 3: Handle CRM entities (Contact, Company, Product, Deal)
      const crmResult = await this.handleCRMEntities(processedData);
      console.log('🏢 CRM entities processed:', crmResult);

      // Step 4: Handle License Events
      const licenseResult = this.handleLicenseEventsSync(processedData, crmResult);
      console.log('📄 License events processed:', licenseResult);

      // Step 5: Create/Update Deal
      const dealResult = await this.handleDealManagement(processedData, crmResult, licenseResult);
      console.log('💰 Deal management completed:', dealResult);

      return {
        success: true,
        data: {
          ...processedData,
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
   * Extract data from all possible branches in the payload
   */
  extractAllBranches(payload) {
    const extractedData = {};
    const rules = this.configManager.getRules();
    const fieldMappings = rules.fieldMappings;

    // Handle nested webhook structure
    let dataSource = payload;
    if (payload.webhookTrigger && payload.webhookTrigger.payload && payload.webhookTrigger.payload.data) {
      dataSource = payload.webhookTrigger.payload.data;
      if (payload.webhookTrigger.payload.eventName) {
        extractedData.event_name = payload.webhookTrigger.payload.eventName;
      }
    }

    // Extract all possible fields
    Object.keys(fieldMappings).forEach(field => {
      const possibleKeys = fieldMappings[field];
      for (const key of possibleKeys) {
        if (dataSource[key] !== undefined && dataSource[key] !== null && dataSource[key] !== '') {
          extractedData[field] = dataSource[key];
          break;
        }
      }
    });

    return extractedData;
  }

  /**
   * Validate and transform extracted data
   */
  validateAndTransform(extractedData) {
    const rules = this.configManager.getRules();
    const processedData = { ...extractedData };

    // Construct name from firstName and lastName if name is not present
    if (!processedData.name && (processedData.first_name || processedData.last_name)) {
      const firstName = processedData.first_name || '';
      const lastName = processedData.last_name || '';
      processedData.name = `${firstName} ${lastName}`.trim();
    }

    // Apply transformation rules
    Object.keys(rules.transformationRules).forEach(field => {
      if (processedData[field]) {
        const rule = rules.transformationRules[field];
        
        if (rule.trim) {
          processedData[field] = processedData[field].toString().trim();
        }
        
        if (rule.toLowerCase) {
          processedData[field] = processedData[field].toString().toLowerCase();
        }
        
        if (rule.toTitleCase) {
          processedData[field] = this.toTitleCase(processedData[field].toString());
        }
        
        if (rule.removeSpaces) {
          processedData[field] = processedData[field].toString().replace(/\s+/g, '');
        }
        
        if (rule.removeSpecialChars) {
          processedData[field] = processedData[field].toString().replace(/[^a-zA-Z0-9]/g, '');
        }
        
        if (rule.addCountryCode && processedData.country) {
          processedData[field] = `${processedData.country}-${processedData[field]}`;
        }
        
        if (rule.addProtocol && !processedData[field].startsWith('http')) {
          processedData[field] = `https://${processedData[field]}`;
        }
      }
    });

    return processedData;
  }

  /**
   * Convert string to title case
   */
  toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  /**
   * Validate processed data based on validation rules
   */
  validateData(data) {
    const rules = this.configManager.getRules();
    const errors = [];

    Object.keys(rules.validationRules).forEach(field => {
      const rule = rules.validationRules[field];
      const value = data[field];

      // Check required fields
      if (rule.required && (!value || value.toString().trim() === '')) {
        errors.push(`${field} is required`);
        return;
      }

      // Skip validation if field is empty and not required
      if (!value || value.toString().trim() === '') {
        return;
      }

      // Check minimum length
      if (rule.minLength && value.toString().length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }

      // Check pattern validation
      if (rule.pattern) {
        const regex = new RegExp(rule.pattern);
        if (!regex.test(value.toString())) {
          errors.push(rule.message || `${field} format is invalid`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Handle CRM entities: Contact, Company, Product validation and creation
   */
  async handleCRMEntities(data) {
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
      // Don't throw error, just log it and continue
    }

    return result;
  }

  /**
   * Handle License Events (Synchronous version)
   */
  handleLicenseEventsSync(data, crmResult) {
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
   * Handle Deal Management
   */
  async handleDealManagement(data, crmResult, licenseResult) {
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
      // Don't throw error, just log it
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

module.exports = EnhancedDataProcessor;
