import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';
import { BlobServiceClient } from '@azure/storage-blob';
import { TableClient } from '@azure/data-tables';
import { config } from '../config.js';

let credential;
function getCredential(){
  if (credential) return credential;
  if (config.nodeEnv === 'production' && config.managedIdentityClientId) {
    credential = new ManagedIdentityCredential(config.managedIdentityClientId);
  } else {
    credential = new DefaultAzureCredential();
  }
  return credential;
}

export function tableClient(tableName){
  if (config.storageConnectionString) return TableClient.fromConnectionString(config.storageConnectionString, tableName);
  if (!config.storageAccountName) throw new Error('AZURE_STORAGE_ACCOUNT_NAME or AZURE_STORAGE_CONNECTION_STRING is required');
  return new TableClient(`https://${config.storageAccountName}.table.core.windows.net`, tableName, getCredential());
}

export function blobServiceClient(){
  if (config.storageConnectionString) return BlobServiceClient.fromConnectionString(config.storageConnectionString);
  if (!config.storageAccountName) throw new Error('AZURE_STORAGE_ACCOUNT_NAME or AZURE_STORAGE_CONNECTION_STRING is required');
  return new BlobServiceClient(`https://${config.storageAccountName}.blob.core.windows.net`, getCredential());
}
