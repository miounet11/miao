#!/bin/bash

# Miaoda Remote SSH Extension Installation Script
# This script installs dependencies and compiles the extension

set -e

EXTENSION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "Miaoda Remote SSH Extension Installer"
echo "========================================"
echo ""

# Check Node.js version
echo "[1/5] Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js version must be 18 or higher"
    echo "Current version: $(node -v)"
    exit 1
fi

echo "✓ Node.js version: $(node -v)"
echo ""

# Check npm
echo "[2/5] Checking npm..."
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed"
    exit 1
fi

echo "✓ npm version: $(npm -v)"
echo ""

# Install dependencies
echo "[3/5] Installing dependencies..."
cd "$EXTENSION_DIR"
npm install

if [ $? -ne 0 ]; then
    echo "Error: Failed to install dependencies"
    exit 1
fi

echo "✓ Dependencies installed"
echo ""

# Compile TypeScript
echo "[4/5] Compiling TypeScript..."
npm run compile

if [ $? -ne 0 ]; then
    echo "Error: Failed to compile TypeScript"
    exit 1
fi

echo "✓ TypeScript compiled"
echo ""

# Verify output
echo "[5/5] Verifying build..."
if [ ! -d "$EXTENSION_DIR/out" ]; then
    echo "Error: Output directory not found"
    exit 1
fi

if [ ! -f "$EXTENSION_DIR/out/extension.js" ]; then
    echo "Error: Extension entry point not found"
    exit 1
fi

echo "✓ Build verified"
echo ""

echo "========================================"
echo "Installation completed successfully!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Restart Miaoda IDE"
echo "2. Open the Remote Explorer view"
echo "3. Add your SSH hosts"
echo "4. Start developing remotely!"
echo ""
echo "For documentation, see: README.md"
echo "For detailed guide, see: DOCUMENTATION.md"
echo ""
