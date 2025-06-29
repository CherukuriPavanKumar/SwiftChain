#!/bin/bash

echo "🚀 Setting up SwiftChain unified platform..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Please update .env file with your configuration"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build shared package
echo "🔧 Building shared package..."
npm run build:shared

# Create logs directory
mkdir -p logs

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Update .env file with your configuration"
echo "2. Run 'npm run dev' to start development servers"
echo "3. Visit http://localhost:3000 for the client"
echo "4. Visit http://localhost:5000/api/health for server health check"