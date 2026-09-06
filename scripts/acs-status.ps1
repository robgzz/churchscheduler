[CmdletBinding()]
param(
  [string]$ResourceGroup = 'rg-church-scheduler-v2',
  [string]$NamePrefix = 'westburyapp',
  [string]$EmailDomain = 'exonuvia.com'
)
$ErrorActionPreference='Stop'
az cloud set --name AzureCloud | Out-Null
$subscription=az account show --query id -o tsv
$emailService="$NamePrefix-email"
$acs="$NamePrefix-acs"
Write-Host "Azure Communication Services resource: $acs" -ForegroundColor Cyan
az resource show --resource-group $ResourceGroup --resource-type Microsoft.Communication/communicationServices --name $acs --api-version 2026-03-18 --query "{name:name,hostName:properties.hostName,linkedDomains:properties.linkedDomains}" -o json
Write-Host "`nEmail domain verification details for $EmailDomain" -ForegroundColor Cyan
$domainEncoded=[System.Uri]::EscapeDataString($EmailDomain)
$url="https://management.azure.com/subscriptions/$subscription/resourceGroups/$ResourceGroup/providers/Microsoft.Communication/emailServices/$emailService/domains/$domainEncoded?api-version=2025-09-01"
az rest --method get --url $url --query "{domain:name,domainManagement:properties.domainManagement,verificationStates:properties.verificationStates,verificationRecords:properties.verificationRecords}" -o json
Write-Host "`nSender expected by Church Scheduler: WestburyChurchofChrist@$EmailDomain" -ForegroundColor Green
