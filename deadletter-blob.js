let BlobServiceClient;
try {
  ({ BlobServiceClient } = require('@azure/storage-blob'));
} catch (e) {
  // Will lazy-require inside functions; swallow here to avoid startup crash
}
const { randomUUID } = require('crypto');

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const DEADLETTER_CONTAINER = process.env.DEADLETTER_CONTAINER_NAME || 'bigin-deadletters';

let client;
let containerClient;
async function getContainerClient() {
  if (!AZURE_STORAGE_CONNECTION_STRING) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is required for Azure Blob dead-letter logic.');
  }
  if (!BlobServiceClient) {
    ({ BlobServiceClient } = require('@azure/storage-blob'));
  }
  if (!client) {
    client = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  }
  if (containerClient) return containerClient;
  const cc = client.getContainerClient(DEADLETTER_CONTAINER);
  const exists = await cc.exists();
  if (!exists) await cc.create();
  containerClient = cc;
  return cc;
}

async function writeDeadLetterBlob(payload, error, headers) {
  const dt = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `deadletter-${dt}-${randomUUID()}.json`;
  const obj = { timestamp: new Date().toISOString(), payload, error, headers };
  try {
    const container = await getContainerClient();
    const body = JSON.stringify(obj, null, 2);
    await container.uploadBlockBlob(name, body, Buffer.byteLength(body));
    return name;
  } catch (err) {
    // Fallback to local file so app keeps working if blob is unavailable
    const fs = require('fs/promises');
    const path = require('path');
    const dir = path.join(__dirname, 'dead_letters');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), JSON.stringify(obj, null, 2));
    return name;
  }
}

async function listDeadLetterBlobs() {
  try {
    const container = await getContainerClient();
    const list = [];
    for await (const blob of container.listBlobsFlat({ prefix: 'deadletter-' })) {
      list.push(blob.name);
    }
    return list;
  } catch {
    // Fallback to local dir listing
    const fs = require('fs/promises');
    const path = require('path');
    const dir = path.join(__dirname, 'dead_letters');
    try {
      const files = await fs.readdir(dir);
      return files.filter(f => f.startsWith('deadletter-'));
    } catch {
      return [];
    }
  }
}

async function getDeadLetterBlob(name) {
  try {
    const container = await getContainerClient();
    const block = await container.getBlobClient(name).download();
    const data = (await streamToBuffer(block.readableStreamBody)).toString('utf8');
    return JSON.parse(data);
  } catch {
    const fs = require('fs/promises');
    const path = require('path');
    const p = path.join(__dirname, 'dead_letters', name);
    const data = await fs.readFile(p, 'utf8');
    return JSON.parse(data);
  }
}

async function writeEventBlob(eventType, data) {
  // Save event logs for analytics (success, retry, failure, etc.)
  const dt = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `analytic-${eventType}-${dt}-${randomUUID()}.json`;
  try {
    const container = await getContainerClient();
    const body = JSON.stringify(data, null, 2);
    await container.uploadBlockBlob(name, body, Buffer.byteLength(body));
    return name;
  } catch {
    // Ignore analytics write failure
    return name;
  }
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
