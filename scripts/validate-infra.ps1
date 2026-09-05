[CmdletBinding()]
param(
  [string]$BicepFile = ""
)
$ErrorActionPreference = "Stop"
if (-not (Get-Command az -ErrorAction SilentlyContinue)) { throw "Azure CLI (az) is required." }
az cloud set --name AzureCloud | Out-Null
try { az bicep version --output none 2>$null } catch { az bicep install | Out-Null }
if (-not $BicepFile) { $BicepFile = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) "infra/main.bicep" }
if (-not (Test-Path $BicepFile)) { throw "Bicep file not found: $BicepFile" }
$out = Join-Path ([System.IO.Path]::GetTempPath()) ("church-v2-" + [guid]::NewGuid().ToString("N") + ".json")
try {
  az bicep build --file $BicepFile --outfile $out
  if ($LASTEXITCODE -ne 0) { throw "Bicep compilation failed." }
  Write-Host "Bicep compilation succeeded: $BicepFile" -ForegroundColor Green
} finally {
  Remove-Item $out -Force -ErrorAction SilentlyContinue
}
