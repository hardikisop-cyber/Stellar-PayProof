param(
  [Parameter(Mandatory=$true)]
  [string]$SourceSecret
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ContractDir = Join-Path $RepoRoot "contracts/soroban-payproof"
$WasmPath = Join-Path $ContractDir "target/wasm32-unknown-unknown/release/soroban_payproof.wasm"
$EnvPath = Join-Path $RepoRoot ".env"

Write-Host "Building Soroban contract..."
Push-Location $ContractDir
cargo build --target wasm32-unknown-unknown --release
Pop-Location

if (!(Test-Path $WasmPath)) {
  throw "WASM not found at $WasmPath"
}

Write-Host "Deploying to Stellar testnet..."
$contractId = stellar contract deploy --wasm $WasmPath --source $SourceSecret --network testnet
$contractId = $contractId.Trim()

if ([string]::IsNullOrWhiteSpace($contractId)) {
  throw "Deployment failed: empty contract ID"
}

Write-Host "Deployed contract ID: $contractId"

if (!(Test-Path $EnvPath)) {
  New-Item -ItemType File -Path $EnvPath -Force | Out-Null
}

$envContent = Get-Content $EnvPath -Raw
if ($envContent -match "NEXT_PUBLIC_SOROBAN_CONTRACT_ID=") {
  $envContent = [Regex]::Replace(
    $envContent,
    "NEXT_PUBLIC_SOROBAN_CONTRACT_ID=.*",
    "NEXT_PUBLIC_SOROBAN_CONTRACT_ID=$contractId"
  )
} else {
  if ($envContent.Length -gt 0 -and !$envContent.EndsWith("`n")) {
    $envContent += "`n"
  }
  $envContent += "NEXT_PUBLIC_SOROBAN_CONTRACT_ID=$contractId`n"
}

Set-Content -Path $EnvPath -Value $envContent
Write-Host "Updated .env with NEXT_PUBLIC_SOROBAN_CONTRACT_ID"
