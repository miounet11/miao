#!/bin/bash

# Development helper script

set -e

echo "🔧 Miaoda Cloud Service - Development Mode"
echo "=========================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "   Run: npm run setup (or ./scripts/setup.sh)"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if database exists
if [ ! -f data/miaoda.db ]; then
    echo "🗄️  Database not found, initializing..."
    npm run migrate
    npm run seed
    echo ""
fi

echo "🚀 Starting development server..."
echo "   Server: http://localhost:3000"
echo "   Health: http://localhost:3000/api/v1/health"
echo "   API: http://localhost:3000/api/v1"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm run dev
