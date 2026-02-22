#!/bin/bash

# Miaoda Cloud Service - Quick Setup Script
# This script sets up the development environment

set -e

echo "🚀 Miaoda Cloud Service - Setup Script"
echo "========================================"
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18 or higher is required"
    echo "   Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file..."
    cp .env.example .env

    # Generate JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

    # Update .env with generated secret
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
    else
        # Linux
        sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
    fi

    echo "✅ .env file created with generated JWT_SECRET"
else
    echo "ℹ️  .env file already exists, skipping..."
fi
echo ""

# Create data directory
echo "📁 Creating data directory..."
mkdir -p data
echo "✅ Data directory created"
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
npm run migrate
echo "✅ Migrations completed"
echo ""

# Seed database
echo "🌱 Seeding database with default data..."
npm run seed
echo "✅ Database seeded"
echo ""

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build
echo "✅ Build completed"
echo ""

echo "✨ Setup completed successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Review .env file and adjust settings if needed"
echo "   2. Start development server: npm run dev"
echo "   3. Visit: http://localhost:3000"
echo "   4. Check health: http://localhost:3000/api/v1/health"
echo ""
echo "📚 Documentation:"
echo "   - README.md - General information"
echo "   - API.md - API documentation"
echo "   - DEPLOYMENT.md - Deployment guide"
echo ""
echo "🧪 Run tests: npm test"
echo "🚀 Start production: npm start"
echo ""
