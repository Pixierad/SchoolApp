# Deploy script: commit + push to GitHub, then export + deploy to Vercel.
# Run from the project root:  .\deploy.ps1

$ErrorActionPreference = 'Stop'

Write-Host "[1/4] Staging changes..." -ForegroundColor Cyan
git add -A

Write-Host "[2/4] Committing..." -ForegroundColor Cyan
$msg = "Add descriptions, theme gallery (with custom themes), centered grow-on-hold FAB"

# git commit exits non-zero if nothing is staged; treat that as OK.
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
git commit -m $msg
$ErrorActionPreference = $prevEAP

Write-Host "[3/4] Pushing to GitHub..." -ForegroundColor Cyan
git push

Write-Host "[4/4] Building web bundle and deploying to Vercel..." -ForegroundColor Cyan
npx expo export --platform web
npx vercel dist --prod

Write-Host "Done." -ForegroundColor Green
