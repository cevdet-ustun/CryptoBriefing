#!/bin/bash

echo "🚀 Deploying Crypto Briefing Proxy Server"
echo "=========================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Deploy to Vercel
echo "🌍 Deploying to Vercel..."
cd proxy-server
vercel --prod

echo "✅ Deployment complete!"
echo "🔗 Update the proxy URL in your main app with the deployment URL shown above"
echo "🔧 Don't forget to set BINANCE_API_KEY and BINANCE_API_SECRET in Vercel dashboard"