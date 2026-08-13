# Teams App Package Builder
# 1. Replace placeholders in manifest.json first
# 2. Add color.png (192x192) and outline.png (32x32) to this folder
# 3. Run this script to create the zip
#
# The zip will contain files at root level (no subfolder):
#   manifest.json, color.png, outline.png

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

$files = @("manifest.json", "color.png", "outline.png")
$outputZip = Join-Path $scriptDir "phishbowl-teams.zip"

foreach ($f in $files) {
    if (-not (Test-Path $f)) {
        Write-Error "Missing: $f"
        exit 1
    }
}

if (Test-Path $outputZip) { Remove-Item $outputZip -Force }

Compress-Archive -LiteralPath $files -DestinationPath $outputZip
Write-Host "Package created: $outputZip" -ForegroundColor Green
Write-Host "Files inside zip: $($files -join ', ')" -ForegroundColor Green
