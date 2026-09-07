[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ServiceAccountJson,
  [Parameter(Mandatory=$true)][string]$FirebaseProjectId,
  [string]$ResourceGroup='rg-church-scheduler-v2',
  [string]$ContainerAppName='westburyapp-web',
  [string]$ContainerJobName='westburyapp-scheduler'
)
$ErrorActionPreference='Stop'
if(!(Test-Path $ServiceAccountJson)){throw "Service account JSON not found: $ServiceAccountJson"}
$bytes=[IO.File]::ReadAllBytes((Resolve-Path $ServiceAccountJson))
$b64=[Convert]::ToBase64String($bytes)
Write-Host 'Configuring Firebase push secret on the Westbury Container App...'
az containerapp secret set --resource-group $ResourceGroup --name $ContainerAppName --secrets "firebase-service-account=$b64" --output none
az containerapp update --resource-group $ResourceGroup --name $ContainerAppName --set-env-vars "FIREBASE_PROJECT_ID=$FirebaseProjectId" "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64=secretref:firebase-service-account" --output none
Write-Host 'Configuring Firebase push secret on the scheduler job...'
az containerapp job secret set --resource-group $ResourceGroup --name $ContainerJobName --secrets "firebase-service-account=$b64" --output none
az containerapp job update --resource-group $ResourceGroup --name $ContainerJobName --set-env-vars "FIREBASE_PROJECT_ID=$FirebaseProjectId" "FIREBASE_SERVICE_ACCOUNT_JSON_BASE64=secretref:firebase-service-account" --output none
Write-Host 'Firebase Android push configuration applied. Keep the service-account JSON private and out of GitHub.'
