const EnhancedDataProcessor = require('./processors/EnhancedDataProcessor');

async function testMultiEndpoint() {
  const processor = new EnhancedDataProcessor();
  
  // Test with webhook payload that has company and lead data
  const testPayload = {
    webhookTrigger: {
      payload: {
        data: {
          firstName: "John",
          lastName: "Doe", 
          email: "john.doe@example.com",
          company: "Example Corp",
          phone: "+1234567890",
          website: "https://example.com",
          message: "Interested in our services"
        },
        eventName: "user.login.register"
      }
    }
  };
  
  console.log('🧪 Testing multi-endpoint functionality...');
  console.log('Input payload:', JSON.stringify(testPayload, null, 2));
  
  try {
    const result = await processor.processWebhookPayload(testPayload);
    console.log('\n✅ Multi-endpoint result:');
    console.log('Success:', result.success);
    
    if (result.success && result.data.zoho) {
      console.log('\n📊 Zoho API Results:');
      console.log('Company:', result.data.zoho.company ? '✅ Created' : '❌ Failed');
      console.log('Lead:', result.data.zoho.lead ? '✅ Created' : '❌ Failed');
      console.log('Contact:', result.data.zoho.contact ? '✅ Created' : '❌ Failed');
      
      if (result.data.zoho.company) {
        console.log('Company details:', JSON.stringify(result.data.zoho.company, null, 2));
      }
      if (result.data.zoho.lead) {
        console.log('Lead details:', JSON.stringify(result.data.zoho.lead, null, 2));
      }
      if (result.data.zoho.contact) {
        console.log('Contact details:', JSON.stringify(result.data.zoho.contact, null, 2));
      }
    } else {
      console.log('❌ Processing failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMultiEndpoint();
