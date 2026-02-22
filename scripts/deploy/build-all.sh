#!/bin/bash
# Build All Components Script
# Builds IDE, extensions, and server for production deployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$ROOT_DIR"

echo "====================================="
echo "  Miaoda IDE - Build All Components"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18 or higher is required. Current version: $(node -v)"
    exit 1
fi
print_status "Node.js version: $(node -v)"

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf out/
rm -rf dist/
rm -rf .build/
mkdir -p dist

# Install dependencies
print_status "Installing dependencies..."
if [ ! -d "node_modules" ]; then
    yarn install --frozen-lockfile --network-timeout 180000
else
    print_status "Dependencies already installed, skipping..."
fi

# Download built-in extensions
print_status "Downloading built-in extensions..."
yarn download-builtin-extensions

# Compile TypeScript
print_status "Compiling TypeScript..."
yarn compile

# Compile build scripts
print_status "Compiling build scripts..."
yarn compile-build

# Compile extensions
print_status "Compiling extensions..."
yarn gulp compile-extensions-build

# Minify for production
print_status "Minifying code for production..."
yarn minify-vscode

# Build server
print_status "Building server components..."
yarn minify-vscode-reh

# Create distribution packages
print_status "Creating distribution packages..."

# Package IDE
print_status "Packaging IDE..."
mkdir -p dist/ide
tar -czf dist/ide/miaoda-ide.tar.gz \
    out/ \
    extensions/ \
    resources/ \
    node_modules/ \
    package.json \
    product.json \
    LICENSE.txt \
    README.md

print_status "IDE package created: dist/ide/miaoda-ide.tar.gz"

# Package server
print_status "Packaging server..."
mkdir -p dist/server
tar -czf dist/server/miaoda-server.tar.gz \
    out/ \
    node_modules/ \
    package.json \
    product.json \
    LICENSE.txt

print_status "Server package created: dist/server/miaoda-server.tar.gz"

# Package extensions separately
print_status "Packaging extensions..."
mkdir -p dist/extensions
for ext in extensions/*/; do
    if [ -f "$ext/package.json" ]; then
        EXT_NAME=$(basename "$ext")
        if [ -d "$ext/out" ] || [ -d "$ext/dist" ]; then
            print_status "Packaging extension: $EXT_NAME"
            cd "$ext"
            tar -czf "../../dist/extensions/$EXT_NAME.tar.gz" .
            cd "$ROOT_DIR"
        fi
    fi
done

# Generate checksums
print_status "Generating checksums..."
cd dist
find . -type f -name "*.tar.gz" -exec sha256sum {} \; > checksums.txt
cd "$ROOT_DIR"

# Build summary
echo ""
echo "====================================="
echo "  Build Complete!"
echo "====================================="
echo ""
print_status "Build artifacts:"
ls -lh dist/ide/
ls -lh dist/server/
ls -lh dist/extensions/ | head -10
echo ""
print_status "Checksums saved to: dist/checksums.txt"
echo ""
print_status "Total build size:"
du -sh dist/
echo ""
print_status "Build completed successfully!"
