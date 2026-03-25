#!/bin/bash
set -e

echo "🔨 Building Bara Patti for Vercel..."

# Clear any existing build artifacts
rm -rf dist .expo

# Install dependencies with pnpm
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Build the web app
echo "🌐 Building web app with Expo..."
npx expo export --platform web

echo "✅ Build complete!"
