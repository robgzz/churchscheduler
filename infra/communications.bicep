targetScope = 'resourceGroup'

@description('Short prefix shared with the existing Church Scheduler deployment.')
@minLength(3)
@maxLength(18)
param namePrefix string = 'westburyapp'

@description('Name of the existing user-assigned managed identity used by the Container App.')
param managedIdentityName string = '${namePrefix}-app-mi'

@description('ACS custom email domain.')
param emailDomain string = 'exonuvia.com'

@description('Sender username before @.')
param emailSenderUsername string = 'WestburyChurchofChrist'

@description('Sender display name.')
param emailSenderDisplayName string = 'Westbury Church of Christ'

@description('Set true only after Azure reports Domain/SPF/DKIM/DKIM2 verification complete.')
param linkVerifiedEmailDomain bool = false

var communicationServiceName = '${namePrefix}-acs'
var emailServiceName = '${namePrefix}-email'
var senderAddress = '${emailSenderUsername}@${emailDomain}'
var contributorRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c')

resource appIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: managedIdentityName
}

resource emailService 'Microsoft.Communication/emailServices@2023-03-31' = {
  name: emailServiceName
  location: 'global'
  properties: {
    dataLocation: 'United States'
  }
}

resource domain 'Microsoft.Communication/emailServices/domains@2025-09-01' = {
  parent: emailService
  name: emailDomain
  location: 'global'
  properties: {
    domainManagement: 'CustomerManaged'
    userEngagementTracking: 'Disabled'
  }
}

resource sender 'Microsoft.Communication/emailServices/domains/senderUsernames@2025-09-01' = {
  parent: domain
  name: emailSenderUsername
  properties: {
    username: emailSenderUsername
    displayName: emailSenderDisplayName
  }
}

resource communicationService 'Microsoft.Communication/communicationServices@2026-03-18' = {
  name: communicationServiceName
  location: 'global'
  properties: {
    dataLocation: 'United States'
    linkedDomains: linkVerifiedEmailDomain ? [domain.id] : []
  }
}

// Microsoft documents Entra ID/managed-identity authentication for ACS. This
// role is deliberately scoped to the ACS resource rather than the resource group.
resource communicationRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(communicationService.id, appIdentity.id, contributorRoleId)
  scope: communicationService
  properties: {
    roleDefinitionId: contributorRoleId
    principalId: appIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

output communicationServiceName string = communicationService.name
output communicationServiceEndpoint string = 'https://${communicationService.properties.hostName}'
output emailServiceName string = emailService.name
output emailDomainResourceId string = domain.id
output emailDomainName string = domain.name
output senderAddress string = senderAddress
output managedIdentityClientId string = appIdentity.properties.clientId
