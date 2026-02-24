#!/bin/bash

# Miaoda IDE Prepare Release Script
# Validates everything is ready for release

set -e

echo "🔍 Miaoda IDE Pre-Release Validation"
echo ""

ERRORS=0

# Check git status
echo "📋 Checking git status..."
if [[ -n $(git status -s) ]]; then
  echo "  ⚠️  Warning: Uncommitted changes detected"
  git status -s
else
  echo "  ✅ Working directory clean"
fi
echo ""

# Check extensions compile
echo "🔨 Checking extensions compile..."
EXTENSIONS=("context-engine" "cost-optimizer" "quality-guardian" "hybrid-model" "knowledge-graph" "embedding-service")

for ext in "${EXTENSIONS[@]}"; do
  echo "  Compiling $ext..."
  cd "extensions/$ext"
  if npm run compile > /dev/null 2>&1; then
    echo "    ✅ $ext compiles"
  else
    echo "    ❌ $ext failed to compile"
    ERRORS=$((ERRORS + 1))
  fi
  cd ../..
done
echo ""

# Check documentation
echo "📚 Checking documentation..."
DOCS=("CHANGELOG.md" "CONTRIBUTING.md" "RELEASE_PROCESS.md" "VERSION.md" "USER_GUIDE.md")

for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    echo "  ✅ $doc exists"
  else
    echo "  ❌ $doc missing"
    ERRORS=$((ERRORS + 1))
  fi
done
echo ""

# Check GitHub workflows
echo "🤖 Checking GitHub workflows..."
WORKFLOWS=("ci.yml" "release.yml" "publish-multi-platform.yml")

for workflow in "${WORKFLOWS[@]}"; do
  if [ -f ".github/workflows/$workflow" ]; then
    echo "  ✅ $workflow exists"
  else
    echo "  ❌ $workflow missing"
    ERRORS=$((ERRORS + 1))
  fi
done
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
  echo "✅ All checks passed! Ready for release."
  echo ""
  echo "Next steps:"
  echo "1. Update CHANGELOG.md with release notes"
  echo "2. Create RELEASE_NOTES_vX.X.X.md"
  echo "3. Run: ./scripts/release.sh X.X.X"
else
  echo "❌ $ERRORS error(s) found. Please fix before releasing."
  exit 1
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
