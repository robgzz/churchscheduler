[CmdletBinding()]
param(
  [string]$ResourceGroup = 'rg-church-scheduler-v2',
  [string]$NamePrefix = 'westburyapp',
  [string]$EmailDomain = 'exonuvia.com',
  [string]$EmailSenderUsername = 'WestburyChurchofChrist',
  [switch]$LinkVerifiedEmailDomain,
  [switch]$EnableEmail,
  [switch]$EnableSms,
  [string]$SmsFromNumber = ''
)
$ErrorActionPreference='Stop'
function Require($name){if(-not(Get-Command $name -ErrorAction SilentlyContinue)){throw "$name is required."}}
Require az
az cloud set --name AzureCloud | Out-Null
az provider register --namespace Microsoft.Communication --wait | Out-Null
az provider register --namespace Microsoft.ManagedIdentity --wait | Out-Null
try { az bicep version --output none 2>$null } catch { az bicep install | Out-Null }
if($EnableEmail -and -not $LinkVerifiedEmailDomain){ throw 'EnableEmail requires -LinkVerifiedEmailDomain. Verify Domain/SPF/DKIM/DKIM2 first.' }
if($EnableSms -and $SmsFromNumber -notmatch '^\+[1-9]\d{7,14}$'){ throw 'EnableSms requires -SmsFromNumber in E.164 format, e.g. +18325551234.' }

$root=Resolve-Path (Join-Path $PSScriptRoot '..')
$template=Join-Path $root 'infra/communications.bicep'
$deployment="church-v25-comms-$(Get-Date -Format yyyyMMddHHmmss)"
Write-Host 'Deploying modular Azure Communication Services infrastructure...' -ForegroundColor Cyan
$json=az deployment group create --resource-group $ResourceGroup --name $deployment --template-file $template --parameters `
  "namePrefix=$NamePrefix" `
  "emailDomain=$EmailDomain" `
  "emailSenderUsername=$EmailSenderUsername" `
  "linkVerifiedEmailDomain=$($LinkVerifiedEmailDomain.IsPresent.ToString().ToLower())" -o json
if($LASTEXITCODE -ne 0){throw 'ACS infrastructure deployment failed.'}
$o=($json|ConvertFrom-Json).properties.outputs
$endpoint=$o.communicationServiceEndpoint.value
$sender=$o.senderAddress.value
$app="$NamePrefix-web"
$job="$NamePrefix-scheduler"
$emailEnabled=$EnableEmail.IsPresent.ToString().ToLower()
$smsEnabled=$EnableSms.IsPresent.ToString().ToLower()
Write-Host 'Updating Container App communication settings...' -ForegroundColor Cyan
az containerapp update -g $ResourceGroup -n $app --set-env-vars `
  "ACS_ENDPOINT=$endpoint" "ACS_EMAIL_SENDER=$sender" "ACS_EMAIL_ENABLED=$emailEnabled" `
  "ACS_SMS_ENABLED=$smsEnabled" "ACS_SMS_FROM_NUMBER=$SmsFromNumber" -o none
if($LASTEXITCODE -ne 0){throw 'Container App communication settings update failed.'}
try {
  az containerapp job update -g $ResourceGroup -n $job --set-env-vars `
    "ACS_ENDPOINT=$endpoint" "ACS_EMAIL_SENDER=$sender" "ACS_EMAIL_ENABLED=$emailEnabled" `
    "ACS_SMS_ENABLED=$smsEnabled" "ACS_SMS_FROM_NUMBER=$SmsFromNumber" -o none
} catch { Write-Warning 'Scheduler job env update did not complete. Web app configuration succeeded.' }
Write-Host "`nACS resource deployed." -ForegroundColor Green
Write-Host "Endpoint: $endpoint"
Write-Host "Email sender: $sender"
Write-Host "Email enabled: $emailEnabled"
Write-Host "SMS enabled: $smsEnabled"
if(-not $LinkVerifiedEmailDomain){
  Write-Host "`nNEXT: run .\scripts\acs-status.ps1 and add the exact TXT/SPF/DKIM records to exonuvia.com DNS." -ForegroundColor Yellow
  Write-Host "After all four checks are verified, rerun this script with -LinkVerifiedEmailDomain -EnableEmail." -ForegroundColor Yellow
}
if(-not $EnableSms){
  Write-Host "SMS remains disabled. Acquire and verify a toll-free SMS number in the ACS portal before enabling it." -ForegroundColor Yellow
}
