# Teams App Package Builder
# 1. Replace placeholders in manifest.json first
# 2. Add your icon PNGs (color.png 192x192, outline.png 32x32)
# 3. Run this script to create the zip package

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$manifestPath = "manifest.json"
$colorIcon = "color.png"
$outlineIcon = "outline.png"
$outputZip = "phishbowl-teams.zip"

if (-not (Test-Path $manifestPath)) { Write-Error "manifest.json not found"; exit 1 }
if (-not (Test-Path $colorIcon)) { Write-Error "color.png (192x192) not found"; exit 1 }
if (-not (Test-Path $outlineIcon)) { Write-Error "outline.png (32x32) not found"; exit 1 }

if (Test-Path $outputZip) { Remove-Item $outputZip -Force }

Compress-Archive -Path $manifestPath, $colorIcon, $outlineIcon -DestinationPath $outputZip
Write-Host "Package created: $outputZip" -ForegroundColor Green
