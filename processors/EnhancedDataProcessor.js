const ConfigManager = require('../config/ConfigManager');
const axios = require('axios');
const { processAndRouteData } = require('../zoho');

class EnhancedDataProcessor {
  constructor() {
    this.configManager = new ConfigManager();
    this.accessToken = null;
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

      // Step 3: Handle CRM entities (Contact, Company, Product, Deal) - Simplified for now
      const crmResult = this.handleCRMEntitiesSync(processedData);
      console.log('🏢 CRM entities processed:', crmResult);

      // Step 4: Handle License Events
      const licenseResult = this.handleLicenseEventsSync(processedData, crmResult);
      console.log('📄 License events processed:', licenseResult);

      // Step 5: Create/Update Deal - Simplified for now
      const dealResult = this.handleDealManagementSync(processedData, crmResult, licenseResult);
      console.log('💰 Deal management completed:', dealResult);

      // Step 6: Send to Zoho Bigin API
      console.log('📤 Sending to Zoho Bigin API...');
      const zohoFormattedData = this.mapToZohoBiginFormat(processedData);
      console.log('📤 Zoho formatted data:', zohoFormattedData);
      const zohoResult = await processAndRouteData(zohoFormattedData);
      console.log('📤 Zoho API result:', zohoResult);

      return {
        success: true,
        data: {
          ...processedData,
          crm: crmResult,
          license: licenseResult,
          deal: dealResult,
          zoho: zohoResult
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
   * Extract data from all 4 branches as per Zoho Flow logic
   */
  extractAllBranches(payload) {
    const rules = this.configManager.getRules();
    const extractedData = {};

    // Handle nested webhook structure (webhookTrigger.payload.data)
    let dataSource = payload;
    if (payload.webhookTrigger && payload.webhookTrigger.payload && payload.webhookTrigger.payload.data) {
      dataSource = payload.webhookTrigger.payload.data;
      // Also extract eventName from the payload structure
      if (payload.webhookTrigger.payload.eventName) {
        extractedData.event_name = payload.webhookTrigger.payload.eventName;
      }
    }

    // Extract all mapped fields
    Object.keys(rules.fieldMappings).forEach(targetField => {
      const possibleKeys = rules.fieldMappings[targetField];
      
      for (const key of possibleKeys) {
        if (dataSource.hasOwnProperty(key) && dataSource[key] !== null && dataSource[key] !== undefined) {
          extractedData[targetField] = dataSource[key];
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

    // Create full name from firstName and lastName if name is not present
    if (!processedData.name && (processedData.first_name || processedData.last_name)) {
      const firstName = processedData.first_name || '';
      const lastName = processedData.last_name || '';
      processedData.name = `${firstName} ${lastName}`.trim();
    }

    // Apply transformations
    Object.keys(rules.transformationRules).forEach(field => {
      const rule = rules.transformationRules[field];
      const value = processedData[field];

      if (!value) return;

      let transformedValue = value.toString();

      if (rule.trim) transformedValue = transformedValue.trim();
      if (rule.toLowerCase) transformedValue = transformedValue.toLowerCase();
      if (rule.titleCase) transformedValue = this.toTitleCase(transformedValue);
      if (rule.removeSpaces) transformedValue = transformedValue.replace(/\s/g, '');
      if (rule.removeSpecialChars) transformedValue = transformedValue.replace(/[^\d+]/g, '');
      if (rule.addCountryCode && !transformedValue.startsWith('+')) {
        transformedValue = rule.addCountryCode + transformedValue;
      }
      if (rule.addProtocol && !transformedValue.match(/^https?:\/\//)) {
        transformedValue = rule.addProtocol + '://' + transformedValue;
      }

      processedData[field] = transformedValue;
    });

    return processedData;
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
   * Map processed data to Zoho Bigin format
   */
  mapToZohoBiginFormat(data) {
    const rules = this.configManager.getRules();
    const zohoData = {};

    // Map fields according to Zoho Bigin field mappings
    Object.keys(rules.zohoFieldMappings).forEach(zohoField => {
      const sourceField = rules.zohoFieldMappings[zohoField];
      if (data[sourceField]) {
        zohoData[zohoField] = data[sourceField];
      }
    });

    // Apply default values
    Object.keys(rules.defaultValues).forEach(field => {
      if (!zohoData[field]) {
        zohoData[field] = rules.defaultValues[field];
      }
    });

    // Ensure required fields for Contact creation
    if (!zohoData.Last_Name) {
      // Try to construct name from available fields
      if (data.name) {
        zohoData.Last_Name = data.name;
      } else if (data.customerName) {
        zohoData.Last_Name = data.customerName;
      } else if (data.firstName && data.lastName) {
        zohoData.Last_Name = `${data.firstName} ${data.lastName}`;
      } else if (data.firstName) {
        zohoData.Last_Name = data.firstName;
      } else if (data.lastName) {
        zohoData.Last_Name = data.lastName;
      } else {
        zohoData.Last_Name = "Unknown Contact"; // Fallback
      }
    }

    // Override Lead_Source to "Website" as requested
    zohoData.Lead_Source = "Website";

    // Remove deal-specific fields for contact creation
    delete zohoData.Pipeline;
    delete zohoData.Stage;
    delete zohoData.Deal_Name;
    delete zohoData.Priority;

    console.log('🔄 Mapped to Zoho format:', zohoData);
    return zohoData;
  }

  /**
   * Check if the event should create a deal
   */
  isDealEvent(eventName) {
    const rules = this.configManager.getRules();
    const dealEvents = [
      ...rules.licenseEventRules.purchaseEvents,
      ...rules.licenseEventRules.purchaseInitiateEvents,
      ...rules.licenseEventRules.renewalEvents,
      ...rules.licenseEventRules.renewalInitiateEvents
    ];
    return dealEvents.includes(eventName);
  }

  /**
   * Get the appropriate deal stage based on event name
   */
  getDealStage(eventName, data) {
    const rules = this.configManager.getRules();
    
    // Check purchase events
    if (rules.licenseEventRules.purchaseEvents.includes(eventName)) {
      return "Closed Won";
    }
    
    // Check purchase initiate events
    if (rules.licenseEventRules.purchaseInitiateEvents.includes(eventName)) {
      return "Purchase Initiated";
    }
    
    // Check renewal events
    if (rules.licenseEventRules.renewalEvents.includes(eventName)) {
      return "Renewal";
    }
    
    // Check renewal initiate events
    if (rules.licenseEventRules.renewalInitiateEvents.includes(eventName)) {
      return "Renewal Initiated";
    }
    
    // Default stage
    return "Qualified";
  }

  /**
   * Generate deal name based on data
   */
  generateDealName(data) {
    const customerName = data.customerName || data.name || 'Unknown Customer';
    const productName = data.productName || 'Product';
    const eventName = data.eventName || 'Event';
    
    return `${customerName} - ${productName} - ${eventName}`;
  }

  /**
   * Handle CRM entities: Contact, Company, Product validation and creation (Synchronous version)
   */
  handleCRMEntitiesSync(data) {
    const result = {
      contact: null,
      company: null,
      product: null,
      isNewContact: false,
      isNewCompany: false
    };

    try {
      // For now, just simulate the CRM operations
      result.contact = { id: 'contact_' + Date.now(), email: data.email, name: data.name };
      result.isNewContact = true;
      
      if (data.company) {
        result.company = { id: 'company_' + Date.now(), name: data.company };
        result.isNewCompany = true;
      }

      if (data.product_name) {
        result.product = { id: 'product_' + Date.now(), name: data.product_name };
      }

      console.log('✅ CRM entities simulated successfully');
    } catch (error) {
      console.error('❌ Error handling CRM entities:', error.message);
      // Don't throw error, just log it
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
   * Handle Deal Management (Synchronous version)
   */
  handleDealManagementSync(data, crmResult, licenseResult) {
    const result = {
      deal: null,
      isNewDeal: false
    };

    try {
      if (!licenseResult.eventType) {
        console.log('⚠️ No license event type, skipping deal management');
        return result;
      }

      // For now, just simulate deal operations
      result.deal = { id: 'deal_' + Date.now(), name: licenseResult.dealName || data.deal_name };
      result.isNewDeal = true;
      console.log('✅ Deal management simulated successfully');
    } catch (error) {
      console.error('❌ Error handling deal management:', error.message);
      // Don't throw error, just log it
    }

    return result;
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
      // Check if contact exists
      const existingContact = await this.findContactByEmail(data.email);
      
      if (existingContact) {
        result.contact = existingContact;
        console.log('✅ Found existing contact:', existingContact.id);
      } else {
        // Create new contact
        result.contact = await this.createContact(data);
        result.isNewContact = true;
        console.log('✅ Created new contact:', result.contact.id);
      }

      // Handle company
      if (data.company) {
        const existingCompany = await this.findCompanyByName(data.company);
        
        if (existingCompany) {
          result.company = existingCompany;
          console.log('✅ Found existing company:', existingCompany.id);
        } else {
          result.company = await this.createCompany(data);
          result.isNewCompany = true;
          console.log('✅ Created new company:', result.company.id);
        }
      }

      // Handle product
      if (data.product_name) {
        const existingProduct = await this.findProductByName(data.product_name);
        
        if (existingProduct) {
          result.product = existingProduct;
          console.log('✅ Found existing product:', existingProduct.id);
        } else {
          // Skip or create default placeholder as per flow logic
          console.log('⚠️ Product not found, skipping as per flow logic');
        }
      }

    } catch (error) {
      console.error('❌ Error handling CRM entities:', error.message);
      throw error;
    }

    return result;
  }

  /**
   * Handle License Events based on eventName field
   */
  async handleLicenseEvents(data, crmResult) {
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
   * Determine trial stage based on contact status and source
   */
  determineTrialStage(data, crmResult) {
    const rules = this.configManager.getRules();
    
    if (crmResult.isNewContact) {
      // New contact logic
      const source = data.source?.toLowerCase();
      if (source === 'website') return rules.stageMapping.trial.newContact.website;
      if (source === 'mp') return rules.stageMapping.trial.newContact.MP;
      return 'Sample - Downloaded';
    } else {
      // Existing contact logic
      const source = data.source;
      if (['PBI Marketplace', 'PowerBI', 'SPZA'].includes(source)) {
        return rules.stageMapping.trial.existingContact[source] || 'Sample - MP';
      }
      if (source === 'Website') {
        return rules.stageMapping.trial.existingContact.Website;
      }
      return 'Trial - License';
    }
  }

  /**
   * Determine trial source based on lead source
   */
  determineTrialSource(data, crmResult) {
    const rules = this.configManager.getRules();
    const source = data.source?.toLowerCase();
    
    if (source === 'website') return rules.sourceMapping.website;
    if (source === 'mp' || source === 'marketplace') return rules.sourceMapping.MP;
    return data.source || 'Webhook';
  }

  /**
   * Determine activation stage based on event name
   */
  determineActivationStage(eventName) {
    const rules = this.configManager.getRules();
    return rules.stageMapping.activation[eventName] || 'Trial - Activated';
  }

  /**
   * Determine purchase stage
   */
  determinePurchaseStage(eventName) {
    const rules = this.configManager.getRules();
    if (eventName.includes('completed')) return rules.stageMapping.purchase.completed;
    if (eventName.includes('initiated')) return rules.stageMapping.purchase.initiated;
    return rules.stageMapping.purchase.completed;
  }

  /**
   * Generate deal name for purchase events
   */
  generateDealName(data) {
    const rules = this.configManager.getRules();
    const dealName = data.deal_name || data.product_name || 'Deal';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${dealName}-CW-${date}`;
  }

  /**
   * Handle Deal creation and updates
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

      // Check if deal exists
      const existingDeal = await this.findDealByName(licenseResult.dealName || data.deal_name);
      
      if (existingDeal) {
        result.deal = await this.updateDeal(existingDeal.id, data, licenseResult);
        console.log('✅ Updated existing deal:', result.deal.id);
      } else {
        result.deal = await this.createDeal(data, crmResult, licenseResult);
        result.isNewDeal = true;
        console.log('✅ Created new deal:', result.deal.id);
      }

    } catch (error) {
      console.error('❌ Error handling deal management:', error.message);
      throw error;
    }

    return result;
  }

  // CRM API Methods (placeholder implementations)
  async findContactByEmail(email) {
    // TODO: Implement Zoho CRM API call to find contact by email
    console.log('🔍 Searching for contact with email:', email);
    return null; // Placeholder
  }

  async createContact(data) {
    // TODO: Implement Zoho CRM API call to create contact
    console.log('👤 Creating contact with data:', data);
    return { id: 'contact_' + Date.now() }; // Placeholder
  }

  async findCompanyByName(companyName) {
    // TODO: Implement Zoho CRM API call to find company by name
    console.log('🔍 Searching for company:', companyName);
    return null; // Placeholder
  }

  async createCompany(data) {
    // TODO: Implement Zoho CRM API call to create company
    console.log('🏢 Creating company with data:', data);
    return { id: 'company_' + Date.now() }; // Placeholder
  }

  async findProductByName(productName) {
    // TODO: Implement Zoho CRM API call to find product by name
    console.log('🔍 Searching for product:', productName);
    return null; // Placeholder
  }

  async findDealByName(dealName) {
    // TODO: Implement Zoho CRM API call to find deal by name
    console.log('🔍 Searching for deal:', dealName);
    return null; // Placeholder
  }

  async createDeal(data, crmResult, licenseResult) {
    // TODO: Implement Zoho CRM API call to create deal
    console.log('💰 Creating deal with data:', { data, crmResult, licenseResult });
    return { id: 'deal_' + Date.now() }; // Placeholder
  }

  async updateDeal(dealId, data, licenseResult) {
    // TODO: Implement Zoho CRM API call to update deal
    console.log('💰 Updating deal:', dealId, { data, licenseResult });
    return { id: dealId }; // Placeholder
  }

  /**
   * Helper function to convert string to title case
   */
  toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
}

module.exports = EnhancedDataProcessor;
