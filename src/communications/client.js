import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';
import { EmailClient } from '@azure/communication-email';
import { SmsClient } from '@azure/communication-sms';
import { config } from '../config.js';

let credential;
let emailClient;
let smsClient;

function getCredential(){
  if (!credential) credential = config.managedIdentityClientId
    ? new ManagedIdentityCredential(config.managedIdentityClientId)
    : new DefaultAzureCredential();
  return credential;
}

export function getEmailClient(){
  if (!config.acsEndpoint) throw new Error('Azure Communication Services endpoint is not configured');
  if (!emailClient) emailClient = new EmailClient(config.acsEndpoint, getCredential());
  return emailClient;
}

export function getSmsClient(){
  if (!config.acsEndpoint) throw new Error('Azure Communication Services endpoint is not configured');
  if (!smsClient) smsClient = new SmsClient(config.acsEndpoint, getCredential());
  return smsClient;
}
