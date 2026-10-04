@echo off
title LDDIGITALCO — Servidor Local
echo Iniciando servidor de LDDIGITALCO...

if exist "%APPDATA%\Antigravity\bin\agy-node.cmd" (
  "%APPDATA%\Antigravity\bin\agy-node.cmd" "%~dp0server.js"
) else (
  node "%~dp0server.js"
)
pause
