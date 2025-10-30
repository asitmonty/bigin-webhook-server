const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const DEADLETTER_CONTAINER = process.env.DEADLETTER_CONTAINER_NAME || 'bigin-deadletters';

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error('AZURE_STORAGE_CONNECTION_STRING is required for Azure Blob dead-letter logic.');
}

const client = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
let containerClient;
async function getContainerClient() {
  if (containerClient) return containerClient;
  containerClient = client.getContainerClient(DEADLETTER_CONTAINER);
  const exists = await containerClient.exists();
  if (!exists) await containerClient.create();
  return containerClient;
}

async function writeDeadLetterBlob(payload, error, headers) {
  const dt = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `deadletter-${dt}-${uuidv4()}.json`;
  const obj = { timestamp: new Date().toISOString(), payload, error, headers };
  const container = await getContainerClient();
  await container.uploadBlockBlob(name, JSON.stringify(obj, null, 2), Buffer.byteLength(JSON.stringify(obj)));
  return name;
}

async function listDeadLetterBlobs() {
  const container = await getContainerClient();
  const list = [];
  for await (const blob of container.listBlobsFlat({ prefix: 'deadletter-' })) {
    list.push(blob.name);
  }
  return list;
}

async function getDeadLetterBlob(name) {
  const container = await getContainerClient();
  const block = await container.getBlobClient(name).download();
  const data = (await streamToBuffer(block.readableStreamBody)).toString('utf8');
  return JSON.parse(data);
}

async function writeEventBlob(eventType, data) {
  // Save event logs for analytics (success, retry, failure, etc.)
  const dt = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `analytic-${eventType}-${dt}-${uuidv4()}.json`;
  const container = await getContainerClient();
  await container.uploadBlockBlob(name, JSON.stringify(data, null, 2), Buffer.byteLength(JSON.stringify(data)));
  return name;
}

async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', data => chunks.push(data instanceof Buffer ? data : Buffer.from(data)));
    readableStream.on('end', () => resolve(Buffer.concat(chunks)));
    readableStream.on('error', reject);
  });
}

module.exports = { writeDeadLetterBlob, listDeadLetterBlobs, getDeadLetterBlob, writeEventBlob };
