@echo off
title POS System - Server
cd /d D:\pos3\project
set PATH=C:\Program Files\nodejs;%PATH%
echo Starting POS Server...
echo Link: http://localhost:5173/
echo.
npx vite --host --port 5173
pause
