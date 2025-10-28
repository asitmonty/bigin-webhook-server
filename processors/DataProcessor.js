const ConfigManager = require('../config/ConfigManager');

class DataProcessor {
  constructor() {
    this.configManager = new ConfigManager();
  }

  /**
   * Extract and map fields from webhook payload based on configuration rules
   */
  extractFields(payload) {
    const rules = this.configManager.getRules();
    const extractedData = {};

    // Map fields based on configuration
    Object.keys(rules.fieldMappings).forEach(targetField => {
      const possibleKeys = rules.fieldMappings[targetField];
      
      for (const key of possibleKeys) {
        if (payload.hasOwnProperty(key) && payload[key] !== null && payload[key] !== undefined) {
          extractedData[targetField] = payload[key];
          break;
        }
      }
    });

    return extractedData;
  }

  /**
   * Validate extracted data based on validation rules
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
   * Transform data based on transformation rules
   */
  transformData(data) {
    const rules = this.configManager.getRules();
    const transformedData = { ...data };

    Object.keys(rules.transformationRules).forEach(field => {
      const rule = rules.transformationRules[field];
      const value = transformedData[field];

      if (!value) return;

      let transformedValue = value.toString();

      // Apply transformations
      if (rule.trim) {
        transformedValue = transformedValue.trim();
      }

      if (rule.toLowerCase) {
        transformedValue = transformedValue.toLowerCase();
      }

      if (rule.titleCase) {
        transformedValue = this.toTitleCase(transformedValue);
      }

      if (rule.removeSpaces) {
        transformedValue = transformedValue.replace(/\s/g, '');
      }

      if (rule.removeSpecialChars) {
        transformedValue = transformedValue.replace(/[^\d+]/g, '');
      }

      if (rule.addCountryCode && !transformedValue.startsWith('+')) {
        transformedValue = rule.addCountryCode + transformedValue;
      }

      if (rule.addProtocol && !transformedValue.match(/^https?:\/\//)) {
        transformedValue = rule.addProtocol + '://' + transformedValue;
      }

      transformedData[field] = transformedValue;
    });

    return transformedData;
  }

  /**
   * Map data to Zoho Bigin format
   */
  mapToZohoFormat(data) {
    const rules = this.configManager.getRules();
    const zohoData = { ...rules.defaultValues };

    // Map fields to Zoho format
    Object.keys(rules.zohoFieldMappings).forEach(zohoField => {
      const sourceField = rules.zohoFieldMappings[zohoField];
      if (data[sourceField]) {
        zohoData[zohoField] = data[sourceField];
      }
    });

    return zohoData;
  }

  /**
   * Process webhook payload through the complete pipeline
   */
  processWebhookPayload(payload) {
    try {
      console.log('🔄 Processing webhook payload:', JSON.stringify(payload, null, 2));

      // Step 1: Extract fields
      const extractedData = this.extractFields(payload);
      console.log('📋 Extracted data:', extractedData);

      // Step 2: Validate data
      const validation = this.validateData(extractedData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Step 3: Transform data
      const transformedData = this.transformData(extractedData);
      console.log('🔄 Transformed data:', transformedData);

      // Step 4: Map to Zoho format
      const zohoData = this.mapToZohoFormat(transformedData);
      console.log('📤 Zoho formatted data:', zohoData);

      return {
        success: true,
        data: zohoData,
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
   * Helper function to convert string to title case
   */
  toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
}

module.exports = DataProcessor;
