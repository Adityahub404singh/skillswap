param(
  [Parameter(Mandatory = $false)]
  [string]$ProjectRoot = "$HOME\skillswap"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$PackageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceRoot = Join-Path $PackageRoot "src"
$TargetRoot = Join-Path $ProjectRoot "src\features\connect"

if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot "package.json"))) {
  throw "package.json was not found in ProjectRoot: $ProjectRoot"
}
if (-not (Test-Path -LiteralPath $SourceRoot)) {
  throw "Package src folder not found: $SourceRoot"
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupRoot = Join-Path $ProjectRoot "_connect-ui-backup-$Stamp"
New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null

if (Test-Path -LiteralPath $TargetRoot) {
  Copy-Item -LiteralPath $TargetRoot -Destination (Join-Path $BackupRoot "connect") -Recurse -Force
}

New-Item -ItemType Directory -Path $TargetRoot -Force | Out-Null
Copy-Item -Path (Join-Path $SourceRoot "features\connect\*") -Destination $TargetRoot -Recurse -Force

Write-Host ""
Write-Host "SkillSwap Connect Premium UI installed." -ForegroundColor Green
Write-Host "Project: $ProjectRoot"
Write-Host "Backup:  $BackupRoot"
Write-Host ""
Write-Host "Next run:"
Write-Host "  cd `"$ProjectRoot`""
Write-Host "  npm run build"
