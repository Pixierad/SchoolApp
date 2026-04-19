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
# Expo's dotenv loader only inlines vars it finds in .env* files -- shell-set
# env vars get ignored. So we write them to .env.production.local just for the
# build, then delete the file so they never hang around. The file pattern
# .env*.local is gitignored, so this never leaks.
$gitShort = (& git rev-parse --short HEAD 2>$null)
$envFile = ".\.env.production.local"
if ($gitShort) {
    $ver = $gitShort.Trim()
    $built = Get-Date -Format "yyyy-MM-dd HH:mm"
    @(
        "EXPO_PUBLIC_APP_VERSION=$ver"
        "EXPO_PUBLIC_APP_BUILT=$built"
    ) | Set-Content -Path $envFile -Encoding utf8
    Write-Host "    Baked version: $ver ($built)" -ForegroundColor DarkGray
}

try {
    # --clear wipes Metro's transform cache so changes to env vars actually
    # produce a new bundle (otherwise Metro reuses the cached one).
    npx expo export --platform web --clear
} finally {
    if (Test-Path $envFile) { Remove-Item $envFile -Force }
}

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
