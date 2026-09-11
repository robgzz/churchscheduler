targetScope = 'resourceGroup'

@description('Short lowercase prefix used in Azure resource names.')
@minLength(3)
@maxLength(18)
param namePrefix string = 'churchv2'

@description('Azure region. Keep Container Apps, ACR and Storage together for low latency and cost.')
param location string = resourceGroup().location

@description('Westbury church identifier used as the Azure Table partition key.')
param churchId string = 'westbury'

@description('Seed profile included in the container image. Use westbury for the supplied migration seed.')
param seedProfile string = 'westbury'

@description('Username that will be promoted to Church Administrator during first-time setup if it matches a migrated member.')
param initialOwnerUsername string = 'churchadmin'

@secure()
@description('One-time setup code used only to create the first Church Administrator. Change/remove it after bootstrap if desired.')
param bootstrapCode string

@description('Public placeholder image used for the initial infrastructure deployment. GitHub Actions replaces it with the application image.')
param initialImage string = 'mcr.microsoft.com/dotnet/samples:aspnetapp'

@description('Public placeholder job image used only during initial infrastructure deployment.')
param initialJobImage string = 'mcr.microsoft.com/k8se/quickstart-jobs:latest'

@description('Minimum web replicas. V3.4 defaults to 1 to eliminate normal scale-to-zero cold starts and improve interactive reliability.')
@minValue(0)
@maxValue(2)
param minReplicas int = 1

@description('Maximum web replicas. Six provides extra burst headroom for service-time traffic.')
@minValue(1)
@maxValue(10)
param maxReplicas int = 6

@description('Scheduler and priority communication job cron in UTC. Default runs every minute.')
param schedulerCron string = '* * * * *'

var suffix = uniqueString(subscription().id, resourceGroup().id)
var storageName = take(toLower(replace('st${namePrefix}${suffix}', '-', '')), 24)
var acrName = take(toLower(replace('acr${namePrefix}${suffix}', '-', '')), 50)
var identityName = '${namePrefix}-app-mi'
var envName = '${namePrefix}-env'
var appName = '${namePrefix}-web'
var jobName = '${namePrefix}-scheduler'
var imageName = 'church-scheduler-v2'
var tableList = [
  'Settings'
  'Users'
  'Sessions'
  'Members'
  'Ministries'
  'Services'
  'ProgramTemplates'
  'Programs'
  'Assignments'
  'HistoryEvents'
  'Content'
  'Songs'
  'VisitorContacts'
  'Petitions'
  'PushSubscriptions'
  'PushDevices'
  'NotificationLogs'
  'NotificationQueue'
  'AppNotifications'
]
var blobContributorRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
var tableContributorRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3')
var acrPullRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
      ipRules: []
      virtualNetworkRules: []
    }
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}
resource attachmentContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'attachments'
  properties: { publicAccess: 'None' }
}
resource importsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'imports'
  properties: { publicAccess: 'None' }
}
resource backupsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'backups'
  properties: { publicAccess: 'None' }
}

resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' = {
  parent: storage
  name: 'default'
}
resource tables 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = [for tableName in tableList: {
  parent: tableService
  name: tableName
}]

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
    policies: {
      retentionPolicy: { days: 7, status: 'disabled' }
    }
  }
}

resource appIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: identityName
  location: location
}

resource storageBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, appIdentity.id, blobContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: blobContributorRoleId
    principalId: appIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}
resource storageTableRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, appIdentity.id, tableContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: tableContributorRoleId
    principalId: appIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}
resource registryPullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, appIdentity.id, acrPullRoleId)
  scope: acr
  properties: {
    roleDefinitionId: acrPullRoleId
    principalId: appIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource environment 'Microsoft.App/managedEnvironments@2025-07-01' = {
  name: envName
  location: location
  properties: {
    // Intentionally omit appLogsConfiguration. In some commercial Azure regions/API
    // preflight currently rejects destination: 'none' even though the schema lists it.
    // Omitting the property leaves the environment with no Log Analytics destination,
    // which preserves the low-cost deployment goal without provisioning a workspace.
    publicNetworkAccess: 'Enabled'
  }
}

resource webApp 'Microsoft.App/containerApps@2025-01-01' = {
  name: appName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${appIdentity.id}': {} }
  }
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        allowInsecure: false
        targetPort: 8080
        transport: 'auto'
      }
      registries: [ { server: acr.properties.loginServer, identity: appIdentity.id } ]
      secrets: [ { name: 'bootstrap-code', value: bootstrapCode } ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: initialImage
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '8080' }
            { name: 'DEFAULT_CHURCH_ID', value: churchId }
            { name: 'SEED_PROFILE', value: seedProfile }
            { name: 'INITIAL_OWNER_USERNAME', value: initialOwnerUsername }
            { name: 'BOOTSTRAP_CODE', secretRef: 'bootstrap-code' }
            { name: 'AZURE_STORAGE_ACCOUNT_NAME', value: storage.name }
            { name: 'AZURE_CLIENT_ID', value: appIdentity.properties.clientId }
            { name: 'AZURE_BLOB_ATTACHMENTS_CONTAINER', value: attachmentContainer.name }
            { name: 'AZURE_BLOB_IMPORTS_CONTAINER', value: importsContainer.name }
            { name: 'AZURE_BLOB_BACKUPS_CONTAINER', value: backupsContainer.name }
            { name: 'COOKIE_SECURE', value: 'true' }
          ]
          resources: { cpu: json('0.5'), memory: '1Gi' }
          probes: [
            { type: 'Startup', httpGet: { path: '/healthz', port: 8080, scheme: 'HTTP' }, initialDelaySeconds: 2, periodSeconds: 3, timeoutSeconds: 2, failureThreshold: 20 }
            { type: 'Liveness', httpGet: { path: '/healthz', port: 8080, scheme: 'HTTP' }, initialDelaySeconds: 10, periodSeconds: 10, timeoutSeconds: 3, failureThreshold: 3 }
            { type: 'Readiness', httpGet: { path: '/healthz', port: 8080, scheme: 'HTTP' }, initialDelaySeconds: 5, periodSeconds: 5, timeoutSeconds: 3, failureThreshold: 3 }
          ]
        }
      ]
      scale: {
        minReplicas: minReplicas
        maxReplicas: maxReplicas
        rules: [
          {
            name: 'http-requests'
            http: {
              metadata: {
                concurrentRequests: '25'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [storageBlobRole, storageTableRole, registryPullRole]
}

resource schedulerJob 'Microsoft.App/jobs@2025-01-01' = {
  name: jobName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${appIdentity.id}': {} }
  }
  properties: {
    environmentId: environment.id
    configuration: {
      triggerType: 'Schedule'
      replicaTimeout: 300
      replicaRetryLimit: 1
      scheduleTriggerConfig: {
        cronExpression: schedulerCron
        parallelism: 1
        replicaCompletionCount: 1
      }
      registries: [ { server: acr.properties.loginServer, identity: appIdentity.id } ]
    }
    template: {
      containers: [
        {
          name: 'scheduler'
          image: initialJobImage
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'DEFAULT_CHURCH_ID', value: churchId }
            { name: 'SEED_PROFILE', value: seedProfile }
            { name: 'AZURE_STORAGE_ACCOUNT_NAME', value: storage.name }
            { name: 'AZURE_CLIENT_ID', value: appIdentity.properties.clientId }
            { name: 'AZURE_BLOB_ATTACHMENTS_CONTAINER', value: attachmentContainer.name }
            { name: 'AZURE_BLOB_IMPORTS_CONTAINER', value: importsContainer.name }
            { name: 'AZURE_BLOB_BACKUPS_CONTAINER', value: backupsContainer.name }
          ]
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
        }
      ]
    }
  }
  dependsOn: [storageBlobRole, storageTableRole, registryPullRole]
}

output containerAppName string = webApp.name
output schedulerJobName string = schedulerJob.name
output containerAppFqdn string = webApp.properties.configuration.ingress.fqdn
output applicationUrl string = 'https://${webApp.properties.configuration.ingress.fqdn}'
output storageAccountName string = storage.name
output containerRegistryName string = acr.name
output containerRegistryLoginServer string = acr.properties.loginServer
output managedIdentityName string = appIdentity.name
output managedIdentityClientId string = appIdentity.properties.clientId
output imageRepository string = imageName
