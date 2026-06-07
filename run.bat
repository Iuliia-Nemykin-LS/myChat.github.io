@echo off
cd /d "%~dp0.."
if not exist "gemini-chatbot\.env" (
  echo Create gemini-chatbot\.env from .env.example and set GEMINI_API_KEY.
  pause
  exit /b 1
)
echo.
echo Open in browser: http://localhost:3000
echo.
npm run chatbot
