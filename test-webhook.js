const axios = require('axios');

// Test configuration
const WEBHOOK_URL = 'http://localhost:3000/webhook';
const TEST_URL = 'http://localhost:3000/test';

// Test data samples based on real webhook examples
const testCases = [
  {
    name: "Purchase Event - Mark SCHMALFELD (BASF)",
    data: {
      "webhookTrigger": {
        "headers": {
          "content_type": "application/json",
          "host": "flow.zoho.com:443",
          "lb_sni": "flow.zoho.com",
          "connection": "close",
          "lb_rls": "PASSED",
          "content_length": 1345,
          "user_agent": "axios/0.21.4",
          "accept": "application/json, text/plain, */*"
        },
        "payload": {
          "data": {
            "lastName": "SCHMALFELD",
            "country": null,
            "subCategory": "single",
            "productName": "Certified - Single License - For team - 51-100 users",
            "stripeFeeCurrency": "usd",
            "licenseType": "team",
            "customerEmail": "mark.schmalfeld@basf.com",
            "customerCompany": "BASF Corporation",
            "licensePurchasedOn": "2025-10-27T18:23:22.940Z",
            "dealDate": "2025-10-27",
            "company": "BASF Corporation",
            "invoiceDetails": {
              "amount": "$252.00",
              "balanceDue": "$0.00",
              "dueDate": null,
              "taxDesc": "",
              "taxNumber": null,
              "tax": "",
              "subTotal": "$252.00",
              "invoiceDate": "Oct 27, 2025",
              "visualTitle": "Box and Whisker with Points (Pro)",
              "total": "$252.00",
              "rate": "$252.00",
              "billTo": "BASF Corporation",
              "paymentMade": "$252.00",
              "invoiceNumber": 2025102701,
              "billingAddress": "25 Middlesex Essex Turnpike",
              "poNumber": null,
              "visualSubTitle": "For Team - upto 100 users"
            },
            "email": "mark.schmalfeld@basf.com",
            "offerTitle": "Box and Whisker with Points (Pro)",
            "leadSource": "website",
            "closedDealName": "Mark SCHMALFELD - BASF Corporation-CW-20251027",
            "dealAmount": 252,
            "licenseEndDate": "2026-10-27T18:23:22.935Z",
            "stripeFee": 962,
            "visualGUID": "",
            "userName": "Mark SCHMALFELD",
            "users": 100,
            "customerName": "Mark SCHMALFELD",
            "dealName": "Mark SCHMALFELD - BASF Corporation",
            "firstName": "Mark",
            "domain": "basf.com",
            "category": "certified",
            "visualKey": "box-and-whisker-with-points-pro"
          },
          "eventName": "visualmaker.license.purchase"
        }
      }
    }
  },
  {
    name: "Purchase Initiated - Mark SCHMALFELD (BASF)",
    data: {
      "webhookTrigger": {
        "headers": {
          "content_type": "application/json",
          "host": "flow.zoho.com:443",
          "lb_sni": "flow.zoho.com",
          "connection": "close",
          "lb_rls": "PASSED",
          "content_length": 717,
          "user_agent": "axios/0.21.4",
          "accept": "application/json, text/plain, */*"
        },
        "payload": {
          "data": {
            "lastName": "SCHMALFELD",
            "country": null,
            "subCategory": "single",
            "leadSource": "website",
            "dealAmount": null,
            "visualGUID": "",
            "userName": "Mark SCHMALFELD",
            "users": 100,
            "customerName": "Mark SCHMALFELD",
            "productName": "Certified - Single License - For team - 51-100 users",
            "dealName": "Mark SCHMALFELD - BASF Corporation",
            "licenseType": "team",
            "firstName": "Mark",
            "customerEmail": "mark.schmalfeld@basf.com",
            "domain": "basf.com",
            "customerCompany": "BASF Corporation",
            "dealDate": "2025-11-03",
            "company": "BASF Corporation",
            "category": "certified",
            "visualKey": "box-and-whisker-with-points-pro",
            "email": "mark.schmalfeld@basf.com",
            "offerTitle": "Box and Whisker with Points (Pro)"
          },
          "eventName": "visualmaker.license.purchaseInitiate"
        }
      }
    }
  },
  {
    name: "Registration Event - Howard Siew (BASF)",
    data: {
      "webhookTrigger": {
        "headers": {
          "content_type": "application/json",
          "host": "flow.zoho.com:443",
          "lb_sni": "flow.zoho.com",
          "connection": "close",
          "lb_rls": "PASSED",
          "content_length": 303,
          "user_agent": "axios/0.21.4",
          "accept": "application/json, text/plain, */*"
        },
        "payload": {
          "data": {
            "dealName": "Howard Siew - basf",
            "firstName": "Howard",
            "lastName": "Siew",
            "country": null,
            "leadSource": "Website",
            "dealAmount": 100,
            "domain": "basf.com",
            "dealDate": "2025-11-26",
            "company": "basf",
            "userName": "Howard Siew",
            "email": "howard.siew@basf.com",
            "offerTitle": ""
          },
          "eventName": "user.login.register"
        }
      }
    }
  },
  {
    name: "Activation Event - Howard Siew (BASF)",
    data: {
      "webhookTrigger": {
        "headers": {
          "content_type": "application/json",
          "host": "flow.zoho.com:443",
          "lb_sni": "flow.zoho.com",
          "connection": "close",
          "lb_rls": "PASSED",
          "content_length": 303,
          "user_agent": "axios/0.21.4",
          "accept": "application/json, text/plain, */*"
        },
        "payload": {
          "data": {
            "dealName": "Howard Siew - basf",
            "firstName": "Howard",
            "lastName": "Siew",
            "country": null,
            "leadSource": "Website",
            "dealAmount": 100,
            "domain": "basf.com",
            "dealDate": "2025-11-26",
            "company": "basf",
            "userName": "Howard Siew",
            "email": "howard.siew@basf.com",
            "offerTitle": ""
          },
          "eventName": "user.login.activate"
        }
      }
    }
  },
  {
    name: "Trial Event - Eduardo Santiago (CEMEX)",
    data: {
      "webhookTrigger": {
        "headers": {
          "content_type": "application/json",
          "host": "flow.zoho.com:443",
          "lb_sni": "flow.zoho.com",
          "connection": "close",
          "lb_rls": "PASSED",
          "content_length": 798,
          "user_agent": "axios/0.21.4",
          "accept": "application/json, text/plain, */*"
        },
        "payload": {
          "data": {
            "lastName": "Santiago",
            "country": null,
            "subCategory": "single",
            "leadSource": "Website",
            "dealAmount": 100,
            "source": "webDirect",
            "visualGUID": "",
            "userName": "Eduardo Antonio Santiago Santiago",
            "users": 100,
            "customerName": "Eduardo Antonio Santiago Santiago",
            "productName": "Standard - Single License - For enterprise - 1-100 users",
            "dealName": "Eduardo Antonio Santiago Santiago - CEMEX",
            "licenseType": "enterprise",
            "firstName": "Eduardo",
            "customerEmail": "eduardoa.santiagos@ext.cemex.com",
            "domain": "ext.cemex.com",
            "customerCompany": "CEMEX",
            "licensePurchasedOn": "2025-10-27T18:07:59.523Z",
            "dealDate": "2025-11-26",
            "company": "CEMEX",
            "category": "uncertified",
            "visualKey": "polar-chart",
            "email": "eduardoa.santiagos@ext.cemex.com",
            "offerTitle": "Polar Chart (Standard)"
          },
          "eventName": "visualmaker.license.trial"
        }
      }
    }
  },
  {
    name: "Renewal Event - Alexander Lee (Veterans Affairs)",
    data: {
      "webhookTrigger": {
        "headers": {
          "content_type": "application/json",
          "host": "flow.zoho.com:443",
          "lb_sni": "flow.zoho.com",
          "connection": "close",
          "lb_rls": "PASSED",
          "content_length": 1293,
          "user_agent": "axios/0.21.4",
          "accept": "application/json, text/plain, */*"
        },
        "payload": {
          "data": {
            "lastName": "Lee",
            "country": "GOV",
            "subCategory": "single",
            "productName": "Standard - Single License - For team - 1-20 users",
            "stripeFeeCurrency": "usd",
            "licenseType": "team",
            "customerEmail": "alexander.s.lee@va.gov",
            "customerCompany": "Veterans Affairs",
            "licensePurchasedOn": "2025-10-27T16:41:17.203Z",
            "dealDate": "2025-10-27",
            "company": "Veterans Affairs",
            "invoiceDetails": {
              "amount": "$96.00",
              "balanceDue": "$0.00",
              "dueDate": null,
              "taxDesc": "",
              "tax": "",
              "subTotal": "$96.00",
              "invoiceDate": "Oct 27, 2025",
              "visualTitle": "Side By Side Bar Chart",
              "total": "$96.00",
              "rate": "$96.00",
              "billTo": "Veterans Affairs",
              "paymentMade": "$96.00",
              "invoiceNumber": 2025102700,
              "billingAddress": "5901 EAST 7TH STREET\nLONG BEACH CA 90822",
              "poNumber": null,
              "visualSubTitle": "For Team - upto 20 users"
            },
            "email": "alexander.s.lee@va.gov",
            "offerTitle": "Side By Side Bar Chart (Standard)",
            "leadSource": "website",
            "closedDealName": "Alexander Lee - Veterans Affairs-CW-20251027",
            "dealAmount": 96,
            "licenseEndDate": "2026-10-29T16:41:17.197Z",
            "stripeFee": 385,
            "visualGUID": "",
            "userName": "Alexander Lee",
            "users": 20,
            "customerName": "Alexander Lee",
            "dealName": "Alexander Lee - Veterans Affairs",
            "firstName": "Alexander",
            "domain": "va.gov",
            "category": "uncertified",
            "visualKey": "merged-bar-chart"
          },
          "eventName": "visualmaker.license.renewal"
        }
      }
    }
  },
  {
    name: "Trial Download Event - Srojas (Microsoft Tenant)",
    data: {
      "webhookTrigger": {
        "headers": {
          "content_type": "application/json",
          "host": "flow.zoho.com:443",
          "lb_sni": "flow.zoho.com",
          "connection": "close",
          "lb_rls": "PASSED",
          "content_length": 805,
          "user_agent": "axios/0.21.4",
          "accept": "application/json, text/plain, */*"
        },
        "payload": {
          "data": {
            "lastName": "Srojas",
            "country": null,
            "subCategory": "single",
            "leadSource": "Website",
            "dealAmount": 100,
            "source": "webDownload",
            "visualGUID": null,
            "userName": "Srojas",
            "users": "unlimited",
            "customerName": "srojas@srojasa.onmicrosoft.com",
            "productName": "Certified - Single License - For full - unlimited users",
            "dealName": "Srojas - srojasa.onmicrosoft",
            "licenseType": "full",
            "firstName": "",
            "customerEmail": "srojas@srojasa.onmicrosoft.com",
            "domain": "srojasa.onmicrosoft.com",
            "customerCompany": null,
            "licensePurchasedOn": "2025-10-27T14:39:29.515Z",
            "dealDate": "2025-11-26",
            "company": "srojasa.onmicrosoft",
            "category": "certified",
            "visualKey": "box-and-whisker-with-points-pro",
            "email": "srojas@srojasa.onmicrosoft.com",
            "offerTitle": "Box and Whisker with Points (Pro)"
          },
          "eventName": "visualmaker.license.downloadTrial"
        }
      }
    }
  },
  {
    name: "Registration Event - Zhao Zhiqiang (Volkswagen)",
    data: {
      "webhookTrigger": {
        "headers": {
          "content_type": "application/json",
          "host": "flow.zoho.com:443",
          "lb_sni": "flow.zoho.com",
          "connection": "close",
          "lb_rls": "PASSED",
          "content_length": 355,
          "user_agent": "axios/0.21.4",
          "accept": "application/json, text/plain, */*"
        },
        "payload": {
          "data": {
            "dealName": "Zhao Zhiqiang - volkswagen-tech",
            "firstName": "Zhao",
            "lastName": "Zhiqiang",
            "country": null,
            "leadSource": "Website",
            "dealAmount": 100,
            "domain": "volkswagen-tech.com",
            "dealDate": "2025-11-26",
            "company": "volkswagen-tech",
            "userName": "Zhao Zhiqiang",
            "email": "zhiqiang.zhao@volkswagen-tech.com",
            "offerTitle": ""
          },
          "eventName": "user.login.register"
        }
      }
    }
  },
  {
    name: "Dashboard Creation Event - Zhao Zhiqiang (Volkswagen)",
    data: {
      "webhookTrigger": {
        "headers": {
          "content_type": "application/json",
          "host": "flow.zoho.com:443",
          "lb_sni": "flow.zoho.com",
          "connection": "close",
          "lb_rls": "PASSED",
          "content_length": 395,
          "user_agent": "axios/0.21.4",
          "accept": "application/json, text/plain, */*"
        },
        "payload": {
          "data": {
            "lastName": "Zhiqiang",
            "country": null,
            "leadSource": "Website",
            "dealAmount": 100,
            "userName": "Zhao Zhiqiang",
            "dashboardName": "Likert Chart",
            "dealName": "Zhao Zhiqiang - volkswagen-tech",
            "firstName": "Zhao",
            "domain": "volkswagen-tech.com",
            "dealDate": "2025-11-26",
            "company": "volkswagen-tech",
            "email": "zhiqiang.zhao@volkswagen-tech.com",
            "offerTitle": "Likert Chart"
          },
          "eventName": "dashboard.create"
        }
      }
    }
  },
  {
    name: "Visual Enqueue Event - Shobhit Kumar (Personal)",
    data: {
      "webhookTrigger": {
        "headers": {
          "content_type": "application/json",
          "host": "flow.zoho.com:443",
          "lb_sni": "flow.zoho.com",
          "connection": "close",
          "lb_rls": "PASSED",
          "content_length": 394,
          "user_agent": "axios/0.21.4",
          "accept": "application/json, text/plain, */*"
        },
        "payload": {
          "data": {
            "lastName": "Kumar",
            "country": null,
            "visualName": "rfm",
            "leadSource": "Website",
            "dealAmount": 100,
            "userName": "Shobhit Kumar",
            "trial": true,
            "dealName": "Shobhit Kumar - gmail",
            "firstName": "Shobhit",
            "license": "guest",
            "domain": "gmail.com",
            "dealDate": "2025-11-26",
            "company": null,
            "email": "shobhit052000@gmail.com",
            "taskId": "gpbhqhpquk",
            "offerTitle": "rfm"
          },
          "eventName": "visualmaker.visual.enqueue"
        }
      }
    }
  }
];

async function testWebhook(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('📋 Input data:', JSON.stringify(testCase.data, null, 2));
  
  try {
    const response = await axios.post(TEST_URL, testCase.data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    console.log('✅ Test passed!');
    console.log('📤 Processed data:', JSON.stringify(response.data.processedData, null, 2));
    
    return { success: true, data: response.data };
  } catch (error) {
    console.log('❌ Test failed!');
    console.log('Error:', error.response?.data || error.message);
    
    return { success: false, error: error.response?.data || error.message };
  }
}

async function testFullWebhook(testCase) {
  console.log(`\n🚀 Full Webhook Test: ${testCase.name}`);
  console.log('📋 Input data:', JSON.stringify(testCase.data, null, 2));
  
  try {
    const response = await axios.post(WEBHOOK_URL, testCase.data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000
    });
    
    console.log('✅ Webhook test passed!');
    console.log('📤 Response:', JSON.stringify(response.data, null, 2));
    
    return { success: true, data: response.data };
  } catch (error) {
    console.log('❌ Webhook test failed!');
    console.log('Error:', error.response?.data || error.message);
    
    return { success: false, error: error.response?.data || error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Webhook Server Tests');
  console.log('=' .repeat(50));
  
  const results = {
    testEndpoint: [],
    webhookEndpoint: []
  };
  
  // Test processing endpoint
  console.log('\n📋 Testing Data Processing Endpoint');
  console.log('-'.repeat(40));
  
  for (const testCase of testCases) {
    const result = await testWebhook(testCase);
    results.testEndpoint.push({ testCase: testCase.name, ...result });
  }
  
  // Test full webhook endpoint (only first test case to avoid creating too many records)
  console.log('\n🌐 Testing Full Webhook Endpoint');
  console.log('-'.repeat(40));
  
  const webhookResult = await testFullWebhook(testCases[0]);
  results.webhookEndpoint.push({ testCase: testCases[0].name, ...webhookResult });
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('=' .repeat(50));
  
  const testPassed = results.testEndpoint.filter(r => r.success).length;
  const testTotal = results.testEndpoint.length;
  
  console.log(`Data Processing Tests: ${testPassed}/${testTotal} passed`);
  
  const webhookPassed = results.webhookEndpoint.filter(r => r.success).length;
  const webhookTotal = results.webhookEndpoint.length;
  
  console.log(`Webhook Tests: ${webhookPassed}/${webhookTotal} passed`);
  
  if (testPassed === testTotal && webhookPassed === webhookTotal) {
    console.log('\n🎉 All tests passed! Your webhook server is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testWebhook, testFullWebhook, runTests };
