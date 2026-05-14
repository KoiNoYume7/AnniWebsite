@echo off
title AnniWebsite Deploy

where pwsh >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PowerShell 7+ ^(pwsh^) not found.
    echo Install from: https://aka.ms/powershell
    pause
    exit /b 1
)

pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" %*
pause
