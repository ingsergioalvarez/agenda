@echo off
echo Stopping Agenda Application...

echo Closing Backend and Frontend windows...
taskkill /F /FI "WINDOWTITLE eq Agenda Backend*"
taskkill /F /FI "WINDOWTITLE eq Agenda Frontend*"

echo Killing any remaining Node.js processes...
taskkill /F /IM node.exe

echo Application stopped.
pause
