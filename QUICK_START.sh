#!/bin/bash
# Quick Start Guide - Tinder2 Reverse Proxy + ngrok

echo "╔════════════════════════════════════════════════════════╗"
echo "║        Tinder2 - Reverse Proxy + ngrok Setup          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

echo "📋 SERVICES RUNNING:"
echo "  ✅ Backend:        http://localhost:5000"
echo "  ✅ Frontend:       http://localhost:3001"
echo "  ✅ Reverse Proxy:  http://localhost:8000"
echo "  ✅ ngrok Tunnel:   https://liminal-transdiaphragmatic-amal.ngrok-free.dev"
echo ""

echo "🚀 STARTUP COMMANDS (4 terminals):"
echo ""
echo "Terminal 1 - Backend:"
echo "  cd C:\\Users\\Administrator\\Documents\\TINDER2\\Tinder2\\backend"
echo "  node server.js"
echo ""

echo "Terminal 2 - Frontend:"
echo "  cd C:\\Users\\Administrator\\Documents\\TINDER2\\Tinder2"
echo "  npm run dev"
echo ""

echo "Terminal 3 - Reverse Proxy:"
echo "  cd C:\\Users\\Administrator\\Documents\\TINDER2\\Tinder2"
echo "  npm run proxy"
echo ""

echo "Terminal 4 - ngrok:"
echo "  .\ngrok-manager.ps1 start"
echo "  OR: \$env:Path += \";$env:ProgramFiles\\ngrok\"; ngrok start proxy"
echo ""

echo "📊 MONITORING:"
echo "  ngrok Dashboard:    http://localhost:4040"
echo "  Status Check:       .\ngrok-manager.ps1 status"
echo ""

echo "🌐 PUBLIC ACCESS:"
echo "  Website:  https://liminal-transdiaphragmatic-amal.ngrok-free.dev/"
echo "  API:      https://liminal-transdiaphragmatic-amal.ngrok-free.dev/api/"
echo ""

echo "📝 IMPORTANT:"
echo "  • ngrok URL changes every ~2 hours"
echo "  • Update .env.local VITE_API_URL when URL changes"
echo "  • Restart frontend after env changes"
echo "  • Check reverseproxy.js for port configuration"
echo ""

echo "✨ You're ready to go!"
