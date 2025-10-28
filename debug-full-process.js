const EnhancedDataProcessor = require('./processors/EnhancedDataProcessor');

async function debugFullProcess() {
  const processor = new EnhancedDataProcessor();
  
  // Test with webhook payload structure
  const testPayload = {
    webhookTrigger: {
      payload: {
        data: {
          firstName: "John",
          lastName: "Doe", 
          email: "john.doe@example.com",
          company: "Example Corp"
        },
        eventName: "user.login.register"
      }
    }
  };
  
  console.log('Testing full process...');
  
  try {
    const result = await processor.processWebhookPayload(testPayload);
    console.log('Full process result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugFullProcess();
