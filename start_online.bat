@echo off
echo ===================================================
echo     Starting EduGate School System Online Tunnel
echo ===================================================
echo.
echo [1/4] Downloading secure tunnel software...
curl.exe -L -s -o ngrok.zip https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip

echo [2/4] Extracting files...
tar.exe -xf ngrok.zip

echo [3/4] Authenticating with your secure token...
ngrok.exe config add-authtoken 3FXqvgBWBZ8dcWM9MQOZiETQP4K_3Hxk5V9a5mJbzJnpYSJSR

echo [4/4] Launching the server!
echo.
echo ===================================================
echo   IMPORTANT: Keep this black window OPEN!
echo   Look for the line that says "Forwarding" 
echo   to find your public link (https://....ngrok-free.app)
echo ===================================================
echo.
ngrok.exe http 80
pause
