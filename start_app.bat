@echo off
echo Starting Agenda Application...

echo Starting Backend on port 4000...
start "Agenda Backend" /D "backend" cmd /k "npm start"

echo Starting Frontend...
start "Agenda Frontend" /D "frontend" cmd /k "npm run dev"

echo Application started!
echo Backend: http://localhost:4000
echo Frontend: http://localhost:5173
pause
