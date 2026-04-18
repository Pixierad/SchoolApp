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
npx expo export --platform web

Write-Host "[5/5] Deploying to Vercel..." -ForegroundColor Cyan

# One-time link: if .vercel\project.json doesn't exist yet, link the project
# non-interactively with sensible defaults. After this, subsequent runs skip
# every prompt.
if (-not (Test-Path ".\.vercel\project.json")) {
    Write-Host "    First deploy detected - linking project..." -ForegroundColor Yellow
    # --yes accepts defaults for scope + project name (uses current folder name).
    npx vercel link --yes
}

# --yes     : auto-answer every prompt with its default
# --prod    : push straight to production (skip preview URL prompt)
# dist      : the folder expo just built
# --token   : read from $env:VERCEL_TOKEN (never hardcode the token in this
#             file - it gets committed to git and GitHub will block the push)
if ($env:VERCEL_TOKEN) {
    npx vercel deploy dist --prod --yes --token $env:VERCEL_TOKEN
} else {
    # No token in env - fall back to whatever session `vercel login` established.
    npx vercel deploy dist --prod --yes
}

Write-Host "Done." -ForegroundColor Green
