@echo off
cd /d "c:\Users\SEAL TEAM\Documents\DATING\Datingapp-1"
echo Staging server.js...
git add backend/server.js
echo Committing...
git commit -m "Fix: Move Lipana webhook before JSON body parser for raw body signature verification"
echo Pushing...
git push origin main
echo Done!
pause
