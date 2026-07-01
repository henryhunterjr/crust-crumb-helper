@echo off
REM Double-click to sync both Skool communities (CCA + FOTM) back-to-back.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-both.ps1"
pause
