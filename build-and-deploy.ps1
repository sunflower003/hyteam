# Build and test script for Windows
Write-Host "🚀 Building Hyteam for deployment..." -ForegroundColor Green

# Navigate to client directory
Set-Location "client"

# Clean previous build
Write-Host "🧹 Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item "dist" -Recurse -Force
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci

# Build the project
Write-Host "🏗️ Building project..." -ForegroundColor Yellow
npm run build

# Check if build was successful
if (Test-Path "dist") {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host "📊 Build output:" -ForegroundColor Cyan
    Get-ChildItem "dist" -Recurse | Select-Object Name, Length
    
    Write-Host ""
    Write-Host "🎯 Next steps:" -ForegroundColor Magenta
    Write-Host "1. Push your code to GitHub" -ForegroundColor White
    Write-Host "2. Go to Vercel.com and import your repository" -ForegroundColor White
    Write-Host "3. Set Root Directory to: client" -ForegroundColor White
    Write-Host "4. Framework will auto-detect as Vite" -ForegroundColor White
    Write-Host "5. Add environment variables:" -ForegroundColor White
    Write-Host "   VITE_API_URL=https://hyteam.onrender.com" -ForegroundColor Gray
    Write-Host "   VITE_SOCKET_URL=https://hyteam.onrender.com" -ForegroundColor Gray
}
else {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host "Check the error messages above." -ForegroundColor Red
}

# Return to root directory
Set-Location ".."

Read-Host "Press Enter to continue..."
