[CmdletBinding()]
param(
  [string]$ResourceGroup='rg-church-scheduler-v2',
  [string]$NamePrefix='westburyapp',
  [switch]$EnableSms,
  [string]$SmsFromNumber=''
)
$parameters=@{
  ResourceGroup=$ResourceGroup
  NamePrefix=$NamePrefix
  EmailDomain='exonuvia.com'
  EmailSenderUsername='WestburyChurchofChrist'
  LinkVerifiedEmailDomain=$true
  EnableEmail=$true
}
if($EnableSms){$parameters.EnableSms=$true;$parameters.SmsFromNumber=$SmsFromNumber}
& (Join-Path $PSScriptRoot 'deploy-communications.ps1') @parameters
