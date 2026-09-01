@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist .env copy .env.example .env >nul
if not exist node_modules (
  echo Installing packages...
  call npm install
  if errorlevel 1 pause & exit /b 1
)
call npm run db:generate
if errorlevel 1 pause & exit /b 1
call npm run db:push
if errorlevel 1 pause & exit /b 1
echo.
echo SCOUT starting: http://localhost:3000
echo Close this window to stop SCOUT.
call npm run dev
pause
