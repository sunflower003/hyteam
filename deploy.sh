#!/bin/bash

echo "🚀 Deploying Hyteam to Production..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
cd client
rm -rf dist
rm -rf node_modules/.vite

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build frontend
echo "🏗️ Building frontend..."
npm run build

echo "✅ Frontend build complete!"

# Check build output
echo "📊 Build output:"
ls -la dist/

echo ""
echo "📋 DEPLOYMENT INSTRUCTIONS:"
echo ""
echo "🔗 VERCEL (Frontend):"
echo "1. Go to vercel.com"
echo "2. Import your GitHub repository"
echo "3. Set Framework Preset: Vite"
echo "4. Set Root Directory: client"
echo "5. Set Build Command: npm run build"
echo "6. Set Output Directory: dist"
echo "7. Set Environment Variables:"
echo "   VITE_API_URL=https://your-backend.onrender.com"
echo "   VITE_SOCKET_URL=https://your-backend.onrender.com"
echo ""
echo "🔗 NETLIFY (Alternative Frontend):"
echo "1. Go to netlify.com"
echo "2. Drag and drop client/dist folder or connect GitHub"
echo "3. Build settings are in netlify.toml"
echo ""
echo "🔗 RENDER (Backend):"
echo "1. Go to render.com"
echo "2. Create Web Service from GitHub"
echo "3. Set Root Directory: server"
echo "4. Set Build Command: npm install"
echo "5. Set Start Command: npm start"
echo "6. Set Environment Variables from .env.example"
echo ""
echo "🎉 Deploy complete! Update your environment variables with actual URLs."
