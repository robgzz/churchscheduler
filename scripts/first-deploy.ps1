[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$ResourceGroup,
  [string]$Location = "centralus",
  [string]$NamePrefix = "churchv2",
  [string]$ChurchId = "westbury",
  [string]$SeedProfile = "westbury",
  [string]$InitialOwnerUsername = "churchadmin",
  [string]$SubscriptionId = "",
  [ValidateRange(0,2)][int]$MinReplicas = 1,
  [string]$BootstrapCode = "",
  [string]$PickupCodeEncryptionKey = "",
  [string]$AppSourcePath = ""
)

$ErrorActionPreference = "Stop"
function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { throw "$name is required but was not found in PATH." }
}
Require-Command az

# Explicitly target Azure public cloud.
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
# Windows PowerShell 5.1 can promote Azure CLI extension warnings written to STDERR
# into NativeCommandError when $ErrorActionPreference is Stop. These lookups are
# best-effort, so temporarily allow native warnings and explicitly inspect exit codes.
$previousErrorActionPreference = $ErrorActionPreference
try {
  $ErrorActionPreference = "Continue"

  $currentWebImage = & az containerapp show `
    --resource-group $ResourceGroup `
    --name $appNameExpected `
    --query "properties.template.containers[0].image" `
    -o tsv 2>$null
  $webLookupExit = $LASTEXITCODE
  if ($webLookupExit -ne 0) { $currentWebImage = "" }

  $currentJobImage = & az containerapp job show `
    --resource-group $ResourceGroup `
    --name $jobNameExpected `
    --query "properties.template.containers[0].image" `
    -o tsv 2>$null
  $jobLookupExit = $LASTEXITCODE
  if ($jobLookupExit -ne 0) { $currentJobImage = "" }

  # If V4.1 infrastructure has already been reconciled once, preserve the
  # existing Children Care encryption secret on a retry/redeploy.
  if (-not $PSBoundParameters.ContainsKey("PickupCodeEncryptionKey")) {
    $existingPickupKey = & az containerapp secret list `
      --resource-group $ResourceGroup `
      --name $appNameExpected `
      --query "[?name=='pickup-code-key'].value | [0]" `
      -o tsv 2>$null
    $secretLookupExit = $LASTEXITCODE
    if ($secretLookupExit -eq 0 -and $existingPickupKey) {
      $PickupCodeEncryptionKey = $existingPickupKey.Trim()
      Write-Host "Reusing existing Children Care encryption key." -ForegroundColor DarkGray
    }
  }
}
finally {
  $ErrorActionPreference = $previousErrorActionPreference
}

# Generate a cryptographically secure 32-byte key only when the caller did not
# supply one and an existing deployed secret could not be recovered.
if (-not $PickupCodeEncryptionKey) {
  $bytes = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($bytes)
  }
  finally {
    $rng.Dispose()
  }
  $PickupCodeEncryptionKey = [Convert]::ToBase64String($bytes)
  Write-Host "Generated a new Children Care encryption key for this deployment." -ForegroundColor DarkGray
}

$bicepParams = @(
  "namePrefix=$NamePrefix",
  "location=$Location",
  "churchId=$ChurchId",
  "seedProfile=$SeedProfile",
  "initialOwnerUsername=$InitialOwnerUsername",
  "minReplicas=$MinReplicas",
  "bootstrapCode=$BootstrapCode",
  "pickupCodeEncryptionKey=$PickupCodeEncryptionKey"
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
$tag = "v4.5.0-$(Get-Date -Format yyyyMMddHHmmss)"
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
