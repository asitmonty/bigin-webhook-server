const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.rules = null;
    this.loadRules();
  }

  loadRules() {
    try {
      const rulesPath = path.join(__dirname, 'rules.json');
      const rulesData = fs.readFileSync(rulesPath, 'utf8');
      this.rules = JSON.parse(rulesData);
      console.log('✅ Configuration rules loaded successfully');
    } catch (error) {
      console.error('❌ Error loading configuration rules:', error.message);
      this.rules = this.getDefaultRules();
    }
  }

  getDefaultRules() {
    return {
      fieldMappings: {
        name: ["name", "Name", "full_name", "Full_Name"],
        email: ["email", "Email", "email_address", "Email_Address"],
        phone: ["phone", "Phone", "mobile", "Mobile"],
        message: ["message", "Message", "description", "Description"]
      },
      validationRules: {
        email: { required: false, pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" },
        phone: { required: false, pattern: "^[\\+]?[1-9][\\d]{0,15}$" },
        name: { required: true, minLength: 2 }
      },
      transformationRules: {
        phone: { removeSpaces: true, removeSpecialChars: true },
        email: { toLowerCase: true, trim: true },
        name: { titleCase: true, trim: true }
      },
      zohoFieldMappings: {
        "Last_Name": "name",
        "Email": "email",
        "Mobile": "phone",
        "Description": "message"
      },
      defaultValues: {
        "Lead_Source": "Webhook",
        "Priority": "Medium"
      }
    };
  }

  getRules() {
    return this.rules;
  }

  reloadRules() {
    this.loadRules();
  }
}

module.exports = ConfigManager;
