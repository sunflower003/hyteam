@echo off
echo 🚀 Building Hyteam for Production...

cd client
echo 🧹 Cleaning previous builds...
if exist dist rmdir /s /q dist
if exist node_modules\.vite rmdir /s /q node_modules\.vite

echo 📦 Installing dependencies...
npm ci

echo 🏗️ Building frontend...
npm run build

echo ✅ Frontend build complete!

echo 📊 Build output:
dir dist

echo.
echo 📋 DEPLOYMENT READY!
echo Upload the client/dist folder to your hosting provider.
pause
