@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo   ==============================================
echo     Extensible Frontend Framework
echo     Scan assets and launch
echo   ==============================================
echo.

if not exist "%~dp0tools\scan-assets.ps1" goto missing

powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\scan-assets.ps1"
if errorlevel 1 goto failed

echo.
echo   Launching index.html ...
timeout /t 2 /nobreak >nul 2>nul
start "" "%~dp0index.html"
endlocal
exit /b 0

:missing
echo   [X] Missing tools\scan-assets.ps1
echo.
pause
exit /b 1

:failed
echo.
echo   [X] Asset scan failed. Fix the message above and try again.
echo.
pause
exit /b 1
