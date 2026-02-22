#!/bin/bash

# Miaoda Remote SSH Extension Verification Script
# Verifies that all files are in place and the extension is ready to build

set -e

EXTENSION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ERRORS=0

echo "========================================"
echo "Miaoda Remote SSH Extension Verification"
echo "========================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1 (missing)"
        ERRORS=$((ERRORS + 1))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
    else
        echo -e "${RED}✗${NC} $1/ (missing)"
        ERRORS=$((ERRORS + 1))
    fi
}

cd "$EXTENSION_DIR"

echo "[1/6] Checking core files..."
check_file "package.json"
check_file "tsconfig.json"
check_file "README.md"
check_file "LICENSE"
echo ""

echo "[2/6] Checking source files..."
check_dir "src"
check_file "src/extension.ts"
check_file "src/sshConnection.ts"
check_file "src/sshFileSystem.ts"
check_file "src/sshTerminal.ts"
check_file "src/sshConfig.ts"
check_file "src/sshTargetsProvider.ts"
echo ""

echo "[3/6] Checking test files..."
check_dir "test"
check_file "test/extension.test.ts"
check_file "test/sshConfig.test.ts"
check_file "test/runTest.ts"
echo ""

echo "[4/6] Checking documentation..."
check_file "DOCUMENTATION.md"
check_file "QUICKSTART.md"
check_file "CHANGELOG.md"
check_file "IMPLEMENTATION_SUMMARY.md"
echo ""

echo "[5/6] Checking examples..."
check_dir "examples"
check_file "examples/ssh-config-examples.txt"
check_file "examples/settings-examples.json"
echo ""

echo "[6/6] Checking configuration files..."
check_file ".gitignore"
check_file ".vscodeignore"
check_file ".eslintrc.json"
check_file "install.sh"
echo ""

echo "========================================"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "========================================"
    echo ""
    echo "Extension structure is complete."
    echo ""
    echo "Next steps:"
    echo "  1. Run: npm install"
    echo "  2. Run: npm run compile"
    echo "  3. Test in Miaoda IDE"
    echo ""
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    echo "========================================"
    echo ""
    echo "Please fix the missing files before proceeding."
    echo ""
    exit 1
fi
