[CmdletBinding()]
param(
  [string]$ResourceGroup = 'rg-church-scheduler-v2',
  [string]$NamePrefix = 'westburyapp',
  [string]$EmailDomain = 'exonuvia.com'
)
$ErrorActionPreference='Stop'
az cloud set --name AzureCloud | Out-Null
$emailService="$NamePrefix-email"
$acs="$NamePrefix-acs"
Write-Host "Azure Communication Services resource: $acs" -ForegroundColor Cyan
az resource show --resource-group $ResourceGroup --resource-type Microsoft.Communication/communicationServices --name $acs --api-version 2026-03-18 --query "{name:name,hostName:properties.hostName,linkedDomains:properties.linkedDomains}" -o json
Write-Host "`nEmail domain verification details for $EmailDomain" -ForegroundColor Cyan
az resource show --resource-group $ResourceGroup --resource-type Microsoft.Communication/emailServices/domains --name "$emailService/$EmailDomain" --api-version 2025-09-01 --query "{domain:name,verificationStates:properties.verificationStates,verificationRecords:properties.verificationRecords}" -o json
Write-Host "`nUse the exact verificationRecords above in the DNS zone hosting exonuvia.com. Azure requires domain ownership TXT plus SPF and DKIM verification before linking the domain." -ForegroundColor Yellow
