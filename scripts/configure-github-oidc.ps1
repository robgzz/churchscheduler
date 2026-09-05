[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ResourceGroup,
  [Parameter(Mandatory=$true)][string]$GitHubOwner,
  [Parameter(Mandatory=$true)][string]$GitHubRepo,
  [string]$Branch = "main",
  [string]$SubscriptionId = ""
)
$ErrorActionPreference = "Stop"
if (-not (Get-Command az -ErrorAction SilentlyContinue)) { throw "Azure CLI (az) is required." }
az cloud set --name AzureCloud | Out-Null
if ($SubscriptionId) { az account set --subscription $SubscriptionId | Out-Null }
$acct = az account show -o json | ConvertFrom-Json
$sub = $acct.id
$tenant = $acct.tenantId
$scope = "/subscriptions/$sub/resourceGroups/$ResourceGroup"

$acr = az resource list -g $ResourceGroup --resource-type Microsoft.ContainerRegistry/registries --query "[0].name" -o tsv
$app = az resource list -g $ResourceGroup --resource-type Microsoft.App/containerApps --query "[0].name" -o tsv
$job = az resource list -g $ResourceGroup --resource-type Microsoft.App/jobs --query "[0].name" -o tsv
if (-not $acr -or -not $app -or -not $job) { throw "Could not find ACR, Container App, and Job in $ResourceGroup. Run first-deploy.ps1 first." }

$display = "github-$GitHubOwner-$GitHubRepo-church-v2"
Write-Host "Creating Entra application/service principal for GitHub OIDC..." -ForegroundColor Cyan
$appReg = az ad app create --display-name $display -o json | ConvertFrom-Json
$clientId = $appReg.appId
$sp = az ad sp create --id $clientId -o json | ConvertFrom-Json

$cred = @{
  name = "github-main"
  issuer = "https://token.actions.githubusercontent.com"
  subject = "repo:$GitHubOwner/$GitHubRepo`:ref:refs/heads/$Branch"
  description = "GitHub Actions branch $Branch"
  audiences = @("api://AzureADTokenExchange")
} | ConvertTo-Json -Depth 5 -Compress
$tmp = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tmp -Value $cred -NoNewline
try { az ad app federated-credential create --id $clientId --parameters "@$tmp" --output none } finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }

Write-Host "Assigning least-necessary deployment roles..." -ForegroundColor Cyan
az role assignment create --assignee-object-id $sp.id --assignee-principal-type ServicePrincipal --role Contributor --scope $scope --output none
$acrId = az acr show -g $ResourceGroup -n $acr --query id -o tsv
az role assignment create --assignee-object-id $sp.id --assignee-principal-type ServicePrincipal --role AcrPush --scope $acrId --output none

Write-Host ""
Write-Host "GitHub OIDC configured." -ForegroundColor Green
Write-Host "Add the following GitHub repository secrets (Settings > Secrets and variables > Actions):"
Write-Host "AZURE_CLIENT_ID=$clientId"
Write-Host "AZURE_TENANT_ID=$tenant"
Write-Host "AZURE_SUBSCRIPTION_ID=$sub"
Write-Host "AZURE_RESOURCE_GROUP=$ResourceGroup"
Write-Host "AZURE_ACR_NAME=$acr"
Write-Host "AZURE_CONTAINER_APP_NAME=$app"
Write-Host "AZURE_CONTAINER_JOB_NAME=$job"
Write-Host ""
Write-Host "No Azure client secret is required; GitHub authenticates by OIDC federation."
