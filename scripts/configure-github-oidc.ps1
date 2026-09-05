[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ResourceGroup,
  [Parameter(Mandatory=$true)][string]$GitHubOwner,
  [Parameter(Mandatory=$true)][string]$GitHubRepo,
  [string]$Branch = "main",
  [string]$SubscriptionId = "",
  [string]$GitHubOwnerId = "",
  [string]$GitHubRepoId = "",
  [string]$GitHubToken = ""
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

# GitHub now uses immutable numeric owner/repository IDs in OIDC subjects for newly created repositories.
# Resolve them automatically when possible. Private repositories may require -GitHubToken.
if (-not $GitHubOwnerId -or -not $GitHubRepoId) {
  try {
    $headers = @{ "User-Agent" = "church-scheduler-v2-oidc"; "Accept" = "application/vnd.github+json" }
    if ($GitHubToken) { $headers["Authorization"] = "Bearer $GitHubToken" }
    $repoInfo = Invoke-RestMethod -Uri "https://api.github.com/repos/$GitHubOwner/$GitHubRepo" -Headers $headers -Method Get
    if (-not $GitHubRepoId) { $GitHubRepoId = [string]$repoInfo.id }
    if (-not $GitHubOwnerId) { $GitHubOwnerId = [string]$repoInfo.owner.id }
  } catch {
    throw "Could not resolve GitHub immutable owner/repository IDs. For a private repo, rerun with -GitHubOwnerId and -GitHubRepoId (or supply -GitHubToken). GitHub Actions now requires the immutable OIDC subject for newly created repositories."
  }
}

$display = "github-$GitHubOwner-$GitHubRepo-church-v2"
Write-Host "Creating or reusing Entra application/service principal for GitHub OIDC..." -ForegroundColor Cyan
$existing = az ad app list --filter "displayName eq '$display'" --query "[0]" -o json | ConvertFrom-Json
if ($existing) { $appReg = $existing } else { $appReg = az ad app create --display-name $display -o json | ConvertFrom-Json }
$clientId = $appReg.appId
$sp = az ad sp list --filter "appId eq '$clientId'" --query "[0]" -o json | ConvertFrom-Json
if (-not $sp) { $sp = az ad sp create --id $clientId -o json | ConvertFrom-Json }

$subject = "repo:$GitHubOwner@$GitHubOwnerId/$GitHubRepo@$GitHubRepoId`:ref:refs/heads/$Branch"
$existingCreds = az ad app federated-credential list --id $clientId -o json | ConvertFrom-Json
if (-not ($existingCreds | Where-Object { $_.subject -eq $subject })) {
  $cred = @{
    name = "github-main-immutable"
    issuer = "https://token.actions.githubusercontent.com"
    subject = $subject
    description = "GitHub Actions immutable branch identity for $Branch"
    audiences = @("api://AzureADTokenExchange")
  } | ConvertTo-Json -Depth 5 -Compress
  $tmp = [System.IO.Path]::GetTempFileName()
  Set-Content -Path $tmp -Value $cred -NoNewline
  try { az ad app federated-credential create --id $clientId --parameters "@$tmp" --output none } finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
}

Write-Host "Assigning deployment roles..." -ForegroundColor Cyan
$existingContributor = az role assignment list --assignee-object-id $sp.id --scope $scope --role Contributor --query "length(@)" -o tsv
if ([int]$existingContributor -eq 0) { az role assignment create --assignee-object-id $sp.id --assignee-principal-type ServicePrincipal --role Contributor --scope $scope --output none }
$acrId = az acr show -g $ResourceGroup -n $acr --query id -o tsv
$existingAcr = az role assignment list --assignee-object-id $sp.id --scope $acrId --role AcrPush --query "length(@)" -o tsv
if ([int]$existingAcr -eq 0) { az role assignment create --assignee-object-id $sp.id --assignee-principal-type ServicePrincipal --role AcrPush --scope $acrId --output none }

Write-Host ""
Write-Host "GitHub OIDC configured." -ForegroundColor Green
Write-Host "Federated subject: $subject"
Write-Host "Add/update the following GitHub repository secrets (Settings > Secrets and variables > Actions):"
Write-Host "AZURE_CLIENT_ID=$clientId"
Write-Host "AZURE_TENANT_ID=$tenant"
Write-Host "AZURE_SUBSCRIPTION_ID=$sub"
Write-Host "AZURE_RESOURCE_GROUP=$ResourceGroup"
Write-Host "AZURE_ACR_NAME=$acr"
Write-Host "AZURE_CONTAINER_APP_NAME=$app"
Write-Host "AZURE_CONTAINER_JOB_NAME=$job"
Write-Host ""
Write-Host "No Azure client secret is required; GitHub authenticates by OIDC federation."
