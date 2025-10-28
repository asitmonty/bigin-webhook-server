const axios = require('axios');
require('dotenv').config();

class ZohoCRMClient {
  constructor() {
    this.accessToken = null;
    this.baseURL = 'https://www.zohoapis.com/crm/v2';
    this.biginURL = 'https://www.zohoapis.com/bigin/v2';
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    try {
      console.log('🔁 Refreshing Zoho CRM access token...');
      const url = 'https://accounts.zoho.com/oauth/v2/token';
      const params = new URLSearchParams({
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token',
      });

      const response = await axios.post(url, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      this.accessToken = response.data.access_token;
      console.log('✅ Zoho CRM access token refreshed successfully');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Token refresh failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Ensure we have a valid access token
   */
  async ensureValidToken() {
    if (!this.accessToken) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Make authenticated API request with retry logic
   */
  async makeRequest(method, url, data = null, retries = 3) {
    await this.ensureValidToken();

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const config = {
          method,
          url,
          headers: {
            'Authorization': `Zoho-oauthtoken ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        };

        if (data) {
          config.data = data;
        }

        const response = await axios(config);
        return response.data;
      } catch (error) {
        console.error(`❌ API request failed (attempt ${attempt}/${retries}):`, error.response?.data || error.message);

        if (error.response?.status === 401 && attempt < retries) {
          console.log('🔁 Token expired, refreshing...');
          await this.refreshAccessToken();
          continue;
        }

        if (attempt === retries) {
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // ==================== CONTACT MANAGEMENT ====================

  /**
   * Find contact by email
   */
  async findContactByEmail(email) {
    try {
      const url = `${this.baseURL}/Contacts/search`;
      const params = new URLSearchParams({
        criteria: `(Email:equals:${email})`,
      });

      const response = await this.makeRequest('GET', `${url}?${params}`);
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      return null;
    } catch (error) {
      console.error('❌ Error finding contact by email:', error.message);
      return null;
    }
  }

  /**
   * Create new contact
   */
  async createContact(contactData) {
    try {
      const url = `${this.baseURL}/Contacts`;
      const payload = {
        data: [{
          Last_Name: contactData.name,
          Email: contactData.email,
          Mobile: contactData.phone,
          Company: contactData.company,
          Lead_Source: contactData.source || 'Webhook',
          Description: contactData.message || 'Lead received via webhook',
          Website: contactData.website,
        }]
      };

      const response = await this.makeRequest('POST', url, payload);
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      throw new Error('No contact data returned from API');
    } catch (error) {
      console.error('❌ Error creating contact:', error.message);
      throw error;
    }
  }

  /**
   * Update existing contact
   */
  async updateContact(contactId, contactData) {
    try {
      const url = `${this.baseURL}/Contacts/${contactId}`;
      const payload = {
        data: [{
          Last_Name: contactData.name,
          Email: contactData.email,
          Mobile: contactData.phone,
          Company: contactData.company,
          Lead_Source: contactData.source || 'Webhook',
          Description: contactData.message || 'Lead received via webhook',
          Website: contactData.website,
        }]
      };

      const response = await this.makeRequest('PUT', url, payload);
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      throw new Error('No contact data returned from API');
    } catch (error) {
      console.error('❌ Error updating contact:', error.message);
      throw error;
    }
  }

  // ==================== COMPANY MANAGEMENT ====================

  /**
   * Find company by name
   */
  async findCompanyByName(companyName) {
    try {
      const url = `${this.baseURL}/Accounts/search`;
      const params = new URLSearchParams({
        criteria: `(Account_Name:equals:${companyName})`,
      });

      const response = await this.makeRequest('GET', `${url}?${params}`);
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      return null;
    } catch (error) {
      console.error('❌ Error finding company by name:', error.message);
      return null;
    }
  }

  /**
   * Create new company
   */
  async createCompany(companyData) {
    try {
      const url = `${this.baseURL}/Accounts`;
      const payload = {
        data: [{
          Account_Name: companyData.company,
          Website: companyData.website,
          Description: companyData.description || 'Company created via webhook',
          Industry: companyData.industry,
        }]
      };

      const response = await this.makeRequest('POST', url, payload);
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      throw new Error('No company data returned from API');
    } catch (error) {
      console.error('❌ Error creating company:', error.message);
      throw error;
    }
  }

  // ==================== PRODUCT MANAGEMENT ====================

  /**
   * Find product by name
   */
  async findProductByName(productName) {
    try {
      const url = `${this.baseURL}/Products/search`;
      const params = new URLSearchParams({
        criteria: `(Product_Name:equals:${productName})`,
      });

      const response = await this.makeRequest('GET', `${url}?${params}`);
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      return null;
    } catch (error) {
      console.error('❌ Error finding product by name:', error.message);
      return null;
    }
  }

  /**
   * Create new product
   */
  async createProduct(productData) {
    try {
      const url = `${this.baseURL}/Products`;
      const payload = {
        data: [{
          Product_Name: productData.product_name,
          Description: productData.description || 'Product created via webhook',
          Unit_Price: productData.price || 0,
          Category: productData.category,
        }]
      };

      const response = await this.makeRequest('POST', url, payload);
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      throw new Error('No product data returned from API');
    } catch (error) {
      console.error('❌ Error creating product:', error.message);
      throw error;
    }
  }

  // ==================== DEAL MANAGEMENT ====================

  /**
   * Find deal by name
   */
  async findDealByName(dealName) {
    try {
      const url = `${this.baseURL}/Deals/search`;
      const params = new URLSearchParams({
        criteria: `(Deal_Name:equals:${dealName})`,
      });

      const response = await this.makeRequest('GET', `${url}?${params}`);
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      return null;
    } catch (error) {
      console.error('❌ Error finding deal by name:', error.message);
      return null;
    }
  }

  /**
   * Create new deal
   */
  async createDeal(dealData) {
    try {
      const url = `${this.baseURL}/Deals`;
      const payload = {
        data: [{
          Deal_Name: dealData.deal_name,
          Account_Name: dealData.company_id ? { id: dealData.company_id } : dealData.company,
          Contact_Name: dealData.contact_id ? { id: dealData.contact_id } : dealData.contact_name,
          Amount: dealData.deal_amount || 0,
          Stage: dealData.stage || 'Prospecting',
          Closing_Date: dealData.deal_date || new Date().toISOString().split('T')[0],
          Description: dealData.description || 'Deal created via webhook',
          Lead_Source: dealData.source || 'Webhook',
          Product_Name: dealData.product_id ? { id: dealData.product_id } : dealData.product_name,
        }]
      };

      const response = await this.makeRequest('POST', url, payload);
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      throw new Error('No deal data returned from API');
    } catch (error) {
      console.error('❌ Error creating deal:', error.message);
      throw error;
    }
  }

  /**
   * Update existing deal
   */
  async updateDeal(dealId, dealData) {
    try {
      const url = `${this.baseURL}/Deals/${dealId}`;
      const payload = {
        data: [{
          Deal_Name: dealData.deal_name,
          Account_Name: dealData.company_id ? { id: dealData.company_id } : dealData.company,
          Contact_Name: dealData.contact_id ? { id: dealData.contact_id } : dealData.contact_name,
          Amount: dealData.deal_amount || 0,
          Stage: dealData.stage || 'Prospecting',
          Closing_Date: dealData.deal_date || new Date().toISOString().split('T')[0],
          Description: dealData.description || 'Deal updated via webhook',
          Lead_Source: dealData.source || 'Webhook',
          Product_Name: dealData.product_id ? { id: dealData.product_id } : dealData.product_name,
        }]
      };

      const response = await this.makeRequest('PUT', url, payload);
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      throw new Error('No deal data returned from API');
    } catch (error) {
      console.error('❌ Error updating deal:', error.message);
      throw error;
    }
  }

  // ==================== BIGIN SPECIFIC METHODS ====================

  /**
   * Create contact in Bigin (simplified version)
   */
  async createBiginContact(contactData) {
    try {
      const url = `${this.biginURL}/Contacts`;
      const payload = {
        data: [{
          Last_Name: contactData.name,
          Email: contactData.email,
          Mobile: contactData.phone,
          Company: contactData.company,
          Lead_Source: contactData.source || 'Webhook',
          Description: contactData.message || 'Lead received via webhook',
        }]
      };

      const response = await this.makeRequest('POST', url, payload);
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      throw new Error('No contact data returned from Bigin API');
    } catch (error) {
      console.error('❌ Error creating Bigin contact:', error.message);
      throw error;
    }
  }
}

module.exports = ZohoCRMClient;
