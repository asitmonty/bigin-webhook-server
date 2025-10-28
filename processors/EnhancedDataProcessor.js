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
   * Now supports both original and derived webhook formats
   */
  extractAllBranches(payload) {
    const rules = this.configManager.getRules();
    const extractedData = {};

    // Detect webhook format and extract accordingly
    if (this.isOriginalFormat(payload)) {
      console.log('📋 Detected original webhook format');
      return this.extractFromOriginalFormat(payload);
    } else {
      console.log('📋 Detected derived webhook format');
      return this.extractFromDerivedFormat(payload);
    }
  }

  /**
   * Check if payload is in original format
   */
  isOriginalFormat(payload) {
    return payload.UserDetails && 
           payload.LeadSource && 
           payload.ActionCode && 
           payload.OfferTitle;
  }

  /**
   * Extract data from original webhook format
   */
  extractFromOriginalFormat(payload) {
    const extractedData = {};
    
    // Extract UserDetails
    if (payload.UserDetails) {
      const user = payload.UserDetails;
      extractedData.first_name = user.FirstName;
      extractedData.last_name = user.LastName;
      extractedData.email = user.Email;
      extractedData.phone = user.Phone;
      extractedData.country = user.Country;
      extractedData.company = user.Company;
      extractedData.user_title = user.Title;
      
      // Create full name
      if (user.FirstName && user.LastName) {
        extractedData.name = `${user.FirstName} ${user.LastName}`;
      }
    }

    // Extract other fields
    extractedData.source = payload.LeadSource;
    extractedData.action_code = payload.ActionCode;
    extractedData.offer_title = payload.OfferTitle;
    extractedData.message = payload.Description;

    // Apply transformation logic for original format
    return this.transformOriginalFormatData(extractedData);
  }

  /**
   * Extract data from derived webhook format (existing logic)
   */
  extractFromDerivedFormat(payload) {
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
   * Transform original format data according to the provided logic
   */
  transformOriginalFormatData(data) {
    const transformed = { ...data };

    // Extract domain from email
    if (transformed.email) {
      const emailParts = transformed.email.split('@');
      if (emailParts.length > 1) {
        transformed.domain = emailParts[1];
      }
    }

    // Generate deal name: contact name + '-' + company name
    if (transformed.name && transformed.company) {
      transformed.deal_name = `${transformed.name}-${transformed.company}`;
    }

    // Generate closed deal name: deal name + '-CW-' + YYYYMMDD
    if (transformed.deal_name) {
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      transformed.closed_deal_name = `${transformed.deal_name}-CW-${date}`;
    }

    // Generate product name using the provided logic
    transformed.product_name = this.makeProductName(
      transformed.offer_title,
      transformed.action_code
    );

    // Generate username from name
    if (transformed.name) {
      transformed.user_name = transformed.name.toLowerCase().replace(/\s+/g, '');
    }

    // Determine category from offer title
    transformed.category = this.determineCategory(transformed.offer_title);

    // Set closing date: 30 days from deal created
    transformed.closing_date = this.getClosingDate();

    // Get item ID from ZohoBooks based on product name
    transformed.item_id = this.getItemIdFromZohoBooks(transformed.product_name);

    // Extract country from email if missing
    if (!transformed.country && transformed.email) {
      transformed.country = this.extractCountryName(transformed.email);
    }

    // Extract company from email if missing
    if (!transformed.company && transformed.email) {
      transformed.company = this.extractCompanyName(transformed.email);
    }

    return transformed;
  }

  /**
   * Determine category from offer title
   */
  determineCategory(offerTitle) {
    if (!offerTitle) return 'Standard';
    
    const title = offerTitle.toLowerCase();
    if (title.includes('pro')) {
      return 'Certified';
    } else if (title.includes('standard')) {
      return 'Standard';
    }
    return 'Standard'; // Default
  }

  /**
   * Format category according to camelcase_category logic
   */
  camelcaseCategory(category) {
    if (!category) return 'Standard';
    
    const cat = category.toLowerCase();
    if (cat === 'certified') {
      return 'Certified';
    } else if (cat === 'uncertified') {
      return 'Standard';
    }
    return category; // Return as-is if not matching
  }

  /**
   * Make product name according to the provided logic
   */
  makeProductName(offerTitle, actionCode) {
    // Extract category from offer title
    const category = this.determineCategory(offerTitle);
    const categoryFormatted = this.camelcaseCategory(category);
    
    // For original format, we'll use simplified logic since we don't have all the fields
    // In a real scenario, these would come from the webhook payload
    const packageType = 'Single'; // Default for original format
    const userBucket = '1-5'; // Default for original format
    const licenseType = 'Standard'; // Default for original format
    
    return this.generateProductName(categoryFormatted, packageType, userBucket, licenseType);
  }

  /**
   * Generate product name according to the provided logic
   */
  generateProductName(category, packageType, userBucket, licenseType) {
    // Format category
    let categoryFormatted = category;
    if (category.toLowerCase() === 'certified') {
      categoryFormatted = 'Certified';
    } else if (category.toLowerCase() === 'uncertified') {
      categoryFormatted = 'Standard';
    }

    // Format package type
    let packageTypeFormatted = packageType;
    if (packageType === 'single' || packageType === 'generated') {
      packageTypeFormatted = 'Single';
    } else if (packageType === 'suite') {
      packageTypeFormatted = 'Suite';
    }

    // Format user bucket
    let userBucketType = userBucket;
    if (userBucket === 'unlimited' || userBucket === '5') {
      userBucketType = '1-5';
    } else if (userBucket === '20') {
      userBucketType = '6-20';
    } else if (userBucket === '50') {
      userBucketType = '21-50';
    } else if (userBucket === '100') {
      userBucketType = '51-100';
    } else if (userBucket === '250') {
      userBucketType = '101-250';
    } else if (userBucket === '500') {
      userBucketType = '251-500';
    } else if (userBucket === '1000') {
      userBucketType = '501-1000';
    } else if (userBucket === '2500') {
      userBucketType = '1001-2500';
    }

    // Create product name
    const productName = `${categoryFormatted} - ${packageTypeFormatted} License - For ${licenseType} - ${userBucketType} users`;
    
    return productName;
  }

  /**
   * Get closing date: 30 days from deal created
   */
  getClosingDate() {
    const closingDate = new Date();
    closingDate.setDate(closingDate.getDate() + 30);
    return closingDate.toISOString().slice(0, 10); // YYYY-MM-DD format
  }

  /**
   * Get item ID from ZohoBooks based on product name
   */
  getItemIdFromZohoBooks(productName) {
    const productNames = [
      "100% Clustered Stacked Bar Chart (Pro)", "100% Clustered Stacked Bar Chart (Standard)",
      "100% Clustered Stacked Column Chart (Standard)", "100% Clustered Stacked Column Chart (Pro)",
      "100% Stacked Column Chart with Values instead of % (Standard)", "Advanced Line Chart (Pro)",
      "Advanced Line Chart (Standard)", "Bubble Chart with Categorical Data (Pro)",
      "Bubble Chart with Categorical Data (Standard)", "Clustered Stacked Bar Chart (Pro)",
      "Clustered Stacked Bar (Standard)", "Clustered Stacked Bar Chart (Standard)",
      "Clustered Stacked Column Chart (Pro)", "Clustered Stacked Column (Standard)",
      "Clustered Stacked Column Chart (Standard)", "Dual Axis Scatter Chart (Pro)",
      "Dual Axis Scatter Chart (Standard)", "Dual X-axis Bar Chart (Pro)",
      "Dual X-Axis Bar Chart (Standard)", "Dual X-Axis Combo Chart (Pro)",
      "Dual X-Axis Combo Chart (Standard)", "Dual Y-Axis Column Chart (Pro)",
      "Dual Y-Axis Column Chart (Pro)", "Dual Y-Axis Column Chart (Standard)",
      "Dual Y-Axis Combo Chart (Pro)", "Dual Y-Axis Combo Chart",
      "Dual Y-Axis Combo Chart (Standard)", "3AC27F842CB619A799E46E73E5DBACD1",
      "BAF37E8630B63AB3A7B1E3E91ADBC989", "Editor Visual Custom (066A58E5FCB7578F8A046DB674742696)",
      "Editor Visual Custom (3AC27F842CB619A799E46E73E5DBACD1)", "Editor Visual Custom (705FA0C5DD0C4906B9E240E9432F26DA)",
      "Editor Visual Custom (914A7D445244267B82D5A619AA757546)", "Editor Visual Custom (92D85C43BD0F18E4B5B7D2841A9439CF)",
      "Editor Visual Custom (bubblewithmaxline89E37174D7124DBAB46AC863300DDCA7)", "Editor Visual Custom (jcorpcustomlipstickEFA5B32ECA94175485E151E54D72520F)",
      "Editor Visual Custom (netpositionvoneED6F920EC7783D3399F7C73A542339CF)", "fullclusteredstackedbarchartD48DA5D21CA91F2F870C298850131128.5.0.2.",
      "Histogram", "histogram069C0ECC45FD5F4CA2D790F607F16387",
      "scatterrrAB4C4E44EFAE50338BE24FD70B630DB8", "verticallinechartADF61B1833105189924A31F668585565",
      "Histogram Chart (Pro)", "Histogram Chart (Standard)", "Horizontal Bullet Chart (Pro)",
      "Horizontal Bullet Chart (Standard)", "Likert Scale (Pro)", "Likert Scale (Standard)",
      "Lipstick Bar (Pro)", "Lipstick Bar Chart (Pro)", "Lipstick Bar Chart (Standard)",
      "Lipstick Column (Pro)", "Lipstick Column Chart (Pro)", "Lipstick Column (Standard)",
      "Lipstick Column Chart (Standard)", "Lollipop Bar Chart (Pro)", "Lollipop Bar Chart (Standard)",
      "Lollipop Column Chart (Pro)", "Lollipop Column Chart (Standard)", "Merged Bar Chart (Pro)",
      "Merged Bar Chart (Standard)", "Side By Side Bar Chart (Standard)", "Multiple Vertical Line Chart (Pro)",
      "Multiple Vertical Line Chart (Standard)", "Overlapping Bar Chart (Pro)", "Overlapping Bar (Standard)",
      "Overlapping Column Chart (Pro)", "Overlapping Column (Standard)", "Overlapping Column Chart (Standard)",
      "Pie Chart with Full Legend Label (Pro)", "Population Pyramid (Pro)", "Population Pyramid (Standard)",
      "Stacked Lipstick Bar Chart (Standard)", "Certified Visuals Suite", "Suite - Certified",
      "Standard Visuals Suite", "Suite - Standard", "Vertical Bullet Chart (Pro)",
      "Vertical Bullet Chart (Standard)", "Vertical Bullet Chart (Standard), Horizontal Bullet Chart (Standard)",
      "Advanced Donut and Pie Chart (Pro)", "Advanced Donut and Pie Chart (Standard)",
      "Bubble Chart with Only Borders (Standard)", "Candlestick Chart (Standard)",
      "Dumbbell Bar Chart (standard)", "Dumbbell Column Chart (standard)",
      "Multiple Axes Chart (Standard)", "Stacked Column with Percentage and Total in Label (Standard)",
      "Stacked Horizontal Funnel (Standard)", "Stacked Lipstick Column Chart (Standard)",
      "Stacked Vertical Funnel (Standard)"
    ];

    const itemIds = [
      "3626086000000085597", "3626086000000085390", "3626086000000085399", "3626086000000085606",
      "3626086000005775527", "3626086000000085714", "3626086000000085507", "3626086000000085723",
      "3626086000000085516", "3626086000000085579", "3626086000000085372", "3626086000000085372",
      "3626086000000085588", "3626086000000085381", "3626086000000085381", "3626086000002636435",
      "3626086000002636444", "3626086000000085651", "3626086000000085444", "3626086000000085741",
      "3626086000000085534", "3626086000005775545", "3626086000005775545", "3626086000005775536",
      "3626086000000085750", "3626086000000085543", "3626086000000085543", "3626086000000085305",
      "3626086000000085305", "3626086000000085305", "3626086000000085305", "3626086000000085305",
      "3626086000000085305", "3626086000000085305", "3626086000000085305", "3626086000000085305",
      "3626086000000085305", "3626086000000085305", "3626086000000085305", "3626086000000085305",
      "3626086000000085305", "3626086000000085305", "3626086000000085305", "3626086000005775554",
      "3626086000005775563", "3626086000000085633", "3626086000000085426", "3626086000000085687",
      "3626086000000085480", "3626086000000085561", "3626086000000085561", "3626086000000085354",
      "3626086000000085570", "3626086000000085570", "3626086000000085363", "3626086000000085363",
      "3626086000000085669", "3626086000000085462", "3626086000000085678", "3626086000000085471",
      "3626086000000085696", "3626086000000085489", "3626086000000085489", "3626086000000085705",
      "3626086000000085498", "3626086000000085615", "3626086000000085408", "3626086000000085624",
      "3626086000000085417", "3626086000000085417", "3626086000000085732", "3626086000000085759",
      "3626086000000085552", "3626086000005775518", "3626086000000085345", "3626086000000085345",
      "3626086000000085336", "3626086000000085336", "3626086000000085642", "3626086000000085435",
      "3626086000000085435", "3626086000006438332", "3626086000006438341", "3626086000006438359",
      "3626086000006438377", "3626086000006438395", "3626086000006438413", "3626086000006438431",
      "3626086000006438449", "3626086000006438467", "3626086000006438485", "3626086000006438503"
    ];

    const index = productNames.indexOf(productName);
    if (index !== -1) {
      return itemIds[index];
    }
    
    // Default item ID if not found
    return "3626086000000085305";
  }

  /**
   * Generate visual purchased title
   */
  generateVisualPurchased(category, subcategory, offerTitle) {
    // Format subcategory
    let packageTypeCorrected = subcategory;
    if (subcategory === 'single' || subcategory === 'generated') {
      packageTypeCorrected = 'Single';
    } else if (subcategory === 'suite') {
      packageTypeCorrected = 'Suite';
    }

    // Format category
    let categoryCorrected = category;
    if (category === 'certified') {
      categoryCorrected = 'Certified';
    } else if (category === 'uncertified') {
      categoryCorrected = 'Standard';
    }

    // Create visual purchased value
    if (!offerTitle || offerTitle === '') {
      return `${packageTypeCorrected} - ${categoryCorrected}`;
    } else {
      return offerTitle;
    }
  }

  /**
   * Generate deal name with enhanced logic
   */
  generateDealName(fullName, email, dealName, companyName) {
    if (!email) return dealName || fullName;

    const emailParts = email.split('@');
    const idFromEmail = emailParts[0];
    const domain = emailParts[1];

    if (!domain) return dealName || fullName;

    const domainParts = domain.split('.');
    const domainName = domainParts[0];
    const domainLastElementPosn = domainParts.length - 1;

    // Check for public domains
    const publicEmailDomains = [
      'gmail.com', 'outlook.com', 'live.com', 'me.com', 'icloud.com',
      'live.fi', 'live.nl', 'mail.ru', 'mailonline.co', 'onmicrosoft.com', 'googlemail.com'
    ];
    const publicEmailDomainMain = ['yahoo', 'hotmail', 'msn', 'tempemail', 'fastmail'];

    // Extract company name if blank or null
    let extractedCompanyName = companyName;
    if (!companyName || companyName === '') {
      const domainPartsCopy = [...domainParts];
      domainPartsCopy.pop(); // Remove last element (TLD)
      extractedCompanyName = domainPartsCopy.join('.');
    }

    // Check if it's a public domain
    const isPublicDomain = publicEmailDomains.includes(domain) || 
                          publicEmailDomainMain.some(publicDomain => domain.includes(publicDomain));

    // Generate deal name
    if (fullName === 'closedwon') {
      const closeDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      return `${dealName}-CW-${closeDate}`;
    } else {
      if (isPublicDomain) {
        return `${idFromEmail} - ${extractedCompanyName}`;
      } else {
        return `${fullName} - ${extractedCompanyName}`;
      }
    }
  }

  /**
   * Extract country name from email domain
   */
  extractCountryName(email) {
    if (!email) return null;

    const emailParts = email.split('@');
    if (emailParts.length < 2) return null;

    const domain = emailParts[1];
    const domainParts = domain.split('.');
    const domainLastElementPosn = domainParts.length - 1;
    const tld = domainParts[domainLastElementPosn];

    // Check for generic TLDs
    const genericTlds = ['com', 'org', 'io', 'net', 'world'];
    if (genericTlds.includes(tld)) {
      return null;
    }

    return tld.toUpperCase();
  }

  /**
   * Extract company name from email domain
   */
  extractCompanyName(email) {
    if (!email) return null;

    const emailParts = email.split('@');
    if (emailParts.length < 2) return null;

    const domain = emailParts[1];
    const domainParts = domain.split('.');
    const domainName = domainParts[0];
    const domainLastElementPosn = domainParts.length - 1;
    const tld = domainParts[domainLastElementPosn];

    // Check for public domains
    const publicEmailDomains = [
      'accounts.google.com', 'data.tableau.com', 'fastmail.fm', 'google.com',
      'mail.angel.co', 'mail.support.microsoft.com', 'marketing.angel.co',
      'messaging.squareup.com', 'quora.com', 'sharepointonline.com', 'stripe.com',
      'triberr.com', 'us-east-2.amazonses.com', 'us-east-2.email-abuse.amazonses.com',
      'youtube.com', '000700.com', '06111991.onmicrosoft.com', '1010space.onmicrosoft.com',
      '1030.be', '1031crowdfunding.com', '10over10.com.tw', '10vip.top', '10xds.com',
      '10xdsdata.onmicrosoft.com', '110.is', '110ftu.onmicrosoft.com', '123milhas.com.br',
      '127.co.nz', '13070173983163.onmicrosoft.com', '139.com', '1500fh.com',
      '177happy.com', '1ddp.in', '1go.ph', '1und1.de', '247international.net',
      '2801123618.onmicrosoft.com', '2be.cr', '2-m.fr', '2mr7xd.onmicrosoft.com',
      '321.ca', '360inclusive.com', '365d.fun', '365i.team', '365-office.club',
      '365svip.ru', '365v.me', '365vip.pro', '39s.top', '3asport.it', '3is.fr',
      '3l.ru', '3mjb5h.onmicrosoft.com', '3qtv.onmicrosoft.com', '3scsolution.com',
      '3shape.com', '3sixtyintegrated.com', '3wm.ma', '477home.org', '4service.net',
      '5040096080.onmicrosoft.com', '50hpvp.onmicrosoft.com', '51zyjiaoyu.com',
      '548ck2.onmicrosoft.com', '5k2u.com', '6069.com', '60decibels.com', '7-11.com',
      '75f.io', '76a.cn', '76ers.com', '7gdistributing.com', '7kqxfj.onmicrosoft.com',
      '8advisory.com', '9pay.vn', 'a.de', '0px5v.onmicrosoft.com', '123.com',
      '126.com', '163.com', 'tempemail.in', 'tmail.com', '365e.live', 'email.in',
      'emailkom.live', 'mail.jusdascm.com', 'vatanmail.ir', 'altmails.com',
      'ccmail.uk', 'chmail.ir', 'freemail.hu', 'gmal.com', 'googlemail.com',
      'icloud.com', 'icoud.com', 'kkumail.com', 'mail.ee', 'mail.ru',
      'mailonline.co.uk', 'msn.cn', 'msn.com', 'protonmail.com', 'qq.com',
      'yandex.ru', 'yopmail.com', 'live.be', 'live.cn', 'live.co.uk', 'live.com',
      'live.fi', 'live.fr', 'live.in', 'live.is', 'live.ku.th', 'live.nl',
      'live.no', 'live.ru', '0-1.ir', '123.ie'
    ];

    const publicEmailDomainMain = ['gmail', 'yahoo', 'hotmail', 'msn', 'outlook', 'zoho'];

    // Check if it's a public domain
    if (publicEmailDomains.includes(domain) || publicEmailDomainMain.includes(domainName)) {
      return null;
    }

    // Check for .com domains
    if (tld === 'com') {
      const domainPartsCopy = [...domainParts];
      domainPartsCopy.pop(); // Remove last element (TLD)
      return domainPartsCopy.join('.');
    }

    // Return full domain for other cases
    return domain;
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
