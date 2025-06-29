#!/bin/bash

echo "🚀 Deploying SwiftChain platform..."

# Build the application
echo "🔧 Building application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

echo "✅ Build completed successfully!"

# Deploy based on environment
if [ "$1" = "production" ]; then
    echo "🌍 Deploying to production..."
    # Add production deployment commands here
    # e.g., docker build, push to registry, etc.
elif [ "$1" = "staging" ]; then
    echo "🧪 Deploying to staging..."
    # Add staging deployment commands here
else
    echo "📦 Build completed. Ready for deployment."
    echo "Usage: ./scripts/deploy.sh [production|staging]"
fi