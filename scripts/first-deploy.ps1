[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ResourceGroup,
  [string]$Location = "centralus",
  [string]$NamePrefix = "churchv2",
  [string]$ChurchId = "westbury",
  [string]$SeedProfile = "westbury",
  [string]$InitialOwnerUsername = "churchadmin",
  [string]$SubscriptionId = "",
  [ValidateRange(0,2)][int]$MinReplicas = 0,
  [string]$BootstrapCode = "",
  [string]$AppSourcePath = ""
)

$ErrorActionPreference = "Stop"
function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { throw "$name is required but was not found in PATH." }
}
Require-Command az

# Explicitly target commercial/public Azure.
az cloud set --name AzureCloud | Out-Null
az config set extension.use_dynamic_install=yes_without_prompt | Out-Null
try { az extension add --name containerapp --upgrade --yes --output none 2>$null } catch {}
try { az bicep version --output none 2>$null } catch { az bicep install | Out-Null }

if ($SubscriptionId) { az account set --subscription $SubscriptionId | Out-Null }
$acct = az account show --output json 2>$null | ConvertFrom-Json
if (-not $acct) { az login | Out-Null; $acct = az account show --output json | ConvertFrom-Json }

Write-Host "Registering Azure resource providers..." -ForegroundColor Cyan
az provider register --namespace Microsoft.App --wait | Out-Null
az provider register --namespace Microsoft.ContainerRegistry --wait | Out-Null
az provider register --namespace Microsoft.Storage --wait | Out-Null
az provider register --namespace Microsoft.ManagedIdentity --wait | Out-Null

$exists = az group exists --name $ResourceGroup
if ($exists -ne "true") {
  Write-Host "Creating resource group $ResourceGroup in $Location..." -ForegroundColor Cyan
  az group create --name $ResourceGroup --location $Location --output none
}

if (-not $BootstrapCode) {
  $BootstrapCode = ([guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")).Substring(0,40)
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$bicep = Join-Path $repoRoot "infra/main.bicep"
if (-not $AppSourcePath) { $AppSourcePath = $repoRoot }
$appRoot = Resolve-Path $AppSourcePath
if (-not (Test-Path (Join-Path $appRoot "Dockerfile"))) { throw "AppSourcePath must point to the extracted Church Scheduler V2 app folder containing Dockerfile." }

# On a redeploy, preserve the currently running images while Bicep reconciles infrastructure.
# This prevents the app/job from being temporarily reset to the public placeholder images.
$appNameExpected = "$NamePrefix-web"
$jobNameExpected = "$NamePrefix-scheduler"
$currentWebImage = az containerapp show --resource-group $ResourceGroup --name $appNameExpected --query "properties.template.containers[0].image" -o tsv 2>$null
$currentJobImage = az containerapp job show --resource-group $ResourceGroup --name $jobNameExpected --query "properties.template.containers[0].image" -o tsv 2>$null

$bicepParams = @(
  "namePrefix=$NamePrefix",
  "location=$Location",
  "churchId=$ChurchId",
  "seedProfile=$SeedProfile",
  "initialOwnerUsername=$InitialOwnerUsername",
  "minReplicas=$MinReplicas",
  "bootstrapCode=$BootstrapCode"
)
if ($currentWebImage) { $bicepParams += "initialImage=$currentWebImage" }
if ($currentJobImage) { $bicepParams += "initialJobImage=$currentJobImage" }

Write-Host "Deploying/reconciling Azure infrastructure..." -ForegroundColor Cyan
$deploymentName = "church-v2-$(Get-Date -Format yyyyMMddHHmmss)"
$deploymentJson = az deployment group create `
  --resource-group $ResourceGroup `
  --name $deploymentName `
  --template-file $bicep `
  --parameters $bicepParams `
  --output json
if ($LASTEXITCODE -ne 0) { throw "Infrastructure deployment failed." }
$d = $deploymentJson | ConvertFrom-Json
$o = $d.properties.outputs

$acr = $o.containerRegistryName.value
$app = $o.containerAppName.value
$job = $o.schedulerJobName.value
$tag = "v2.5.0-$(Get-Date -Format yyyyMMddHHmmss)"
$image = "$($o.containerRegistryLoginServer.value)/church-scheduler-v2:$tag"

Write-Host "Building application image $tag in Azure Container Registry..." -ForegroundColor Cyan
Push-Location $appRoot
try {
  az acr build --registry $acr --image "church-scheduler-v2:$tag" . --output none
  if ($LASTEXITCODE -ne 0) { throw "Container image build failed." }
} finally { Pop-Location }

Write-Host "Updating Container App and scheduled job to $tag..." -ForegroundColor Cyan
az containerapp update --resource-group $ResourceGroup --name $app --image $image --output none
if ($LASTEXITCODE -ne 0) { throw "Container App update failed." }
az containerapp job update --resource-group $ResourceGroup --name $job --image $image --command node --args src/jobs/scheduler.js --output none
if ($LASTEXITCODE -ne 0) { throw "Scheduler job update failed." }

az containerapp ingress update --resource-group $ResourceGroup --name $app --target-port 8080 --transport auto --output none

Write-Host "Starting one scheduler execution..." -ForegroundColor Cyan
az containerapp job start --resource-group $ResourceGroup --name $job --output none

$latest = az containerapp show --resource-group $ResourceGroup --name $app --query properties.configuration.ingress.fqdn -o tsv
Write-Host ""
Write-Host "Deployment complete." -ForegroundColor Green
Write-Host "App URL: https://$latest"
Write-Host "Image: $image"
Write-Host "One-time bootstrap code: $BootstrapCode" -ForegroundColor Yellow
Write-Host "Initial owner username: $InitialOwnerUsername"
Write-Host ""
Write-Host "If the Church Administrator was already bootstrapped, you can ignore the newly generated bootstrap code."
