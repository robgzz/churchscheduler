[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$AuthKeyP8,
  [Parameter(Mandatory=$true)][string]$TeamId,
  [Parameter(Mandatory=$true)][string]$KeyId,
  [string]$BundleId='com.exonuvia.westburychurchscheduler',
  [string]$ResourceGroup='rg-church-scheduler-v2',
  [string]$ContainerAppName='westburyapp-web',
  [string]$ContainerJobName='westburyapp-scheduler'
)
$ErrorActionPreference='Stop'
if(!(Test-Path $AuthKeyP8)){throw "APNs .p8 key not found: $AuthKeyP8"}
$bytes=[IO.File]::ReadAllBytes((Resolve-Path $AuthKeyP8))
$b64=[Convert]::ToBase64String($bytes)
Write-Host 'Configuring Apple Push Notification service secret on the Westbury Container App...'
az containerapp secret set --resource-group $ResourceGroup --name $ContainerAppName --secrets "apns-private-key=$b64" --output none
az containerapp update --resource-group $ResourceGroup --name $ContainerAppName --set-env-vars "APNS_ENABLED=true" "APNS_TEAM_ID=$TeamId" "APNS_KEY_ID=$KeyId" "APNS_BUNDLE_ID=$BundleId" "APNS_PRIVATE_KEY_BASE64=secretref:apns-private-key" --output none
Write-Host 'Configuring Apple Push Notification service secret on the scheduler job...'
az containerapp job secret set --resource-group $ResourceGroup --name $ContainerJobName --secrets "apns-private-key=$b64" --output none
az containerapp job update --resource-group $ResourceGroup --name $ContainerJobName --set-env-vars "APNS_ENABLED=true" "APNS_TEAM_ID=$TeamId" "APNS_KEY_ID=$KeyId" "APNS_BUNDLE_ID=$BundleId" "APNS_PRIVATE_KEY_BASE64=secretref:apns-private-key" --output none
Write-Host 'APNs configuration applied. Keep the .p8 file private and out of GitHub.'
