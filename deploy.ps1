# Deploy script: commit + push to GitHub, then export + deploy to Vercel.
# Run from the project root:  .\deploy.ps1
#
# First run only: you'll be asked to log in to Vercel and pick/create a project.
# That info is saved into .vercel\project.json, and every run after this one
# is fully non-interactive (no Enter mashing).

$ErrorActionPreference = 'Stop'

Write-Host "[1/5] Staging changes..." -ForegroundColor Cyan
git add -A

Write-Host "[2/5] Committing..." -ForegroundColor Cyan
$msg = "Deploy: latest changes"
if ($args.Count -gt 0) { $msg = $args -join ' ' }

# git commit exits non-zero if nothing is staged; treat that as OK.
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
git commit -m $msg
$ErrorActionPreference = $prevEAP

Write-Host "[3/5] Pushing to GitHub..." -ForegroundColor Cyan
git push

Write-Host "[4/5] Building web bundle..." -ForegroundColor Cyan

# Bake the current commit into the bundle so the app can show its live version.
$gitShort = (& git rev-parse --short HEAD 2>$null)
if ($gitShort) {
    $env:EXPO_PUBLIC_APP_VERSION = $gitShort.Trim()
    $env:EXPO_PUBLIC_APP_BUILT = Get-Date -Format "yyyy-MM-dd HH:mm"
    Write-Host "    Baked version: $($env:EXPO_PUBLIC_APP_VERSION) ($($env:EXPO_PUBLIC_APP_BUILT))" -ForegroundColor DarkGray
}

npx expo export --platform web

Write-Host "[5/5] Deploying to Vercel..." -ForegroundColor Cyan

# Force dist/ to deploy to the schoolapp project, not auto-link to a new "dist" project.
if (-not (Test-Path ".\.vercel\project.json")) {
    Write-Host "    Missing .\.vercel\project.json - run 'vercel link' once first." -ForegroundColor Yellow
    exit 1
}
New-Item -ItemType Directory -Force -Path ".\dist\.vercel" | Out-Null
Copy-Item ".\.vercel\project.json" ".\dist\.vercel\project.json" -Force

if ($env:VERCEL_TOKEN) {
    npx vercel deploy dist --prod --yes --token $env:VERCEL_TOKEN
} else {
    npx vercel deploy dist --prod --yes
}

Write-Host "Done." -ForegroundColor Green
