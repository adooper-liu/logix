param(
  [switch]$WithIntegration,
  [switch]$WithStats,
  [switch]$All
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($All) {
  $WithIntegration = $true
  $WithStats = $true
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][string]$Command
  )

  Write-Host ""
  Write-Host "== $Title ==" -ForegroundColor Cyan
  Write-Host ">> $Command" -ForegroundColor DarkGray

  Invoke-Expression $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Title"
  }
}

Write-Host "LogiX Quality Checks (Local)" -ForegroundColor Green
Write-Host "Working directory: $PSScriptRoot\.." -ForegroundColor DarkGray

Push-Location (Join-Path $PSScriptRoot '..')
try {
  Invoke-Step -Title '1) Backend Unit Test' -Command 'npm run test:backend'
  Invoke-Step -Title '2) Backend Type Check' -Command 'npm run type-check:backend'
  Invoke-Step -Title '3) Backend Lint' -Command 'npm run lint:backend'

  if ($WithIntegration) {
    Invoke-Step -Title '4) Integration Test' -Command 'npm run test:backend:integration -- --detectOpenHandles --forceExit'
  }

  if ($WithStats) {
    $statsScriptPath = Join-Path (Get-Location) 'backend/scripts/verify-statistics-by-filter-consistency.ts'
    if (Test-Path $statsScriptPath) {
      Invoke-Step -Title '5) Statistics Verify' -Command 'npm run verify:stats-filter'
    } else {
      Write-Host ""
      Write-Host "== 5) Statistics Verify (optional) ==" -ForegroundColor Yellow
      Write-Host "⚠️ Skipped: missing script backend/scripts/verify-statistics-by-filter-consistency.ts" -ForegroundColor Yellow
    }
  }

  Write-Host ""
  Write-Host "✅ All requested quality checks finished." -ForegroundColor Green
}
finally {
  Pop-Location
}
