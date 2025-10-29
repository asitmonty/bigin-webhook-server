const testPayload = {
  "UserDetails": {
    "FirstName": "Some",
    "LastName": "One",
    "Email": "someone@contoso.com",
    "Phone": "16175555555",
    "Country": "USA",
    "Company": "Contoso",
    "Title": "Esquire"
  },
  "LeadSource": "AzureMarketplace",
  "ActionCode": "INS",
  "OfferTitle": "Test Microsoft",
  "License": null,
  "Description": "Test run through Power Automate"
};

console.log('Testing payload structure:');
console.log('UserDetails exists:', !!testPayload.UserDetails);
console.log('UserDetails type:', typeof testPayload.UserDetails);
console.log('FirstName exists:', !!testPayload.UserDetails.FirstName);
console.log('LastName exists:', !!testPayload.UserDetails.LastName);
console.log('LeadSource exists:', !!testPayload.LeadSource);
console.log('ActionCode exists:', !!testPayload.ActionCode);
console.log('OfferTitle exists:', !!testPayload.OfferTitle);

const isOriginal = testPayload.UserDetails && 
       typeof testPayload.UserDetails === 'object' &&
       testPayload.UserDetails.FirstName &&
       testPayload.UserDetails.LastName &&
       testPayload.LeadSource && 
       testPayload.ActionCode && 
       testPayload.OfferTitle;

console.log('Should be original format:', isOriginal);
