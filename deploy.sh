#!/bin/bash

echo "🚀 Deploying Hyteam to Production..."

# Build and deploy frontend
echo "📦 Building frontend..."
cd client
npm run build

echo "✅ Frontend build complete!"

# Instructions for deployment
echo ""
echo "📋 DEPLOYMENT INSTRUCTIONS:"
echo ""
echo "🔗 VERCEL (Frontend):"
echo "1. Go to vercel.com"
echo "2. Import your GitHub repository"
echo "3. Set Root Directory: client"
echo "4. Set Environment Variables:"
echo "   VITE_API_URL=https://your-backend.onrender.com"
echo "   VITE_SOCKET_URL=https://your-backend.onrender.com"
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
