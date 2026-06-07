@echo off
set "GH=C:\Program Files\GitHub CLI\gh.exe"

if not exist "%GH%" (
  echo GitHub CLI not found. Install from: https://cli.github.com/
  pause
  exit /b 1
)

cd /d "%~dp0"

echo.
echo === Step 1: Login to GitHub ===
"%GH%" auth login

echo.
echo === Step 2: Create repo and push ===
"%GH%" repo create qa-automation-assistant --public --source=. --remote=origin --push

echo.
echo === Done ===
echo Your GitHub Pages site will deploy automatically after push.
echo Check: Settings - Pages - GitHub Actions
pause
