const EnhancedDataProcessor = require('./processors/EnhancedDataProcessor');

async function testProcessor() {
  const processor = new EnhancedDataProcessor();
  
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
  
  try {
    console.log('Testing EnhancedDataProcessor...');
    const result = await processor.processWebhookPayload(testPayload);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testProcessor();
