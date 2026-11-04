@echo off
title JurisFlow Local
cd /d "%~dp0"
npm.cmd run local
if errorlevel 1 pause
