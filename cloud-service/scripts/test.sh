#!/bin/bash

# Test runner script with options

set -e

echo "🧪 Miaoda Cloud Service - Test Runner"
echo "======================================"
echo ""

# Parse arguments
WATCH=false
COVERAGE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --watch|-w)
            WATCH=true
            shift
            ;;
        --coverage|-c)
            COVERAGE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--watch|-w] [--coverage|-c]"
            exit 1
            ;;
    esac
done

# Run tests
if [ "$WATCH" = true ]; then
    echo "Running tests in watch mode..."
    npm run test:watch
elif [ "$COVERAGE" = true ]; then
    echo "Running tests with coverage..."
    npm test
    echo ""
    echo "📊 Coverage report generated in: coverage/"
    echo "   Open coverage/index.html in browser to view"
else
    echo "Running tests..."
    npm test -- --verbose=false
fi
