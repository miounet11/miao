#!/bin/bash

# Miaoda IDE Release Script
# Usage: ./scripts/release.sh <version>

set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "❌ Error: Version required"
  echo "Usage: ./scripts/release.sh <version>"
  echo "Example: ./scripts/release.sh 0.9.0"
  exit 1
fi

echo "🚀 Miaoda IDE Release Script"
echo "Version: $VERSION"
echo ""

# Confirm
read -p "Continue with release v$VERSION? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Release cancelled"
  exit 1
fi

echo "📦 Step 1: Update versions..."
EXTENSIONS=("context-engine" "cost-optimizer" "quality-guardian" "hybrid-model" "knowledge-graph" "embedding-service")

for ext in "${EXTENSIONS[@]}"; do
  echo "  Updating $ext..."
  cd "extensions/$ext"
  npm version "$VERSION" --no-git-tag-version
  cd ../..
done

echo "✅ Versions updated"
echo ""

echo "🔨 Step 2: Build all extensions..."
for ext in "${EXTENSIONS[@]}"; do
  echo "  Building $ext..."
  cd "extensions/$ext"
  npm install
  npm run compile
  cd ../..
done

echo "✅ Build complete"
echo ""

echo "📝 Step 3: Commit changes..."
git add .
git commit -m "chore: release v$VERSION

- Update version to $VERSION
- Build all extensions
- Ready for release

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

echo "✅ Changes committed"
echo ""

echo "🏷️  Step 4: Create git tag..."
git tag -a "v$VERSION" -m "Release v$VERSION

See RELEASE_NOTES_v$VERSION.md for details."

echo "✅ Tag created"
echo ""

echo "📤 Step 5: Push to GitHub..."
echo "  Pushing main branch..."
git push origin main

echo "  Pushing tag (this will trigger release)..."
git push origin "v$VERSION"

echo "✅ Pushed to GitHub"
echo ""

echo "🎉 Release v$VERSION initiated!"
echo ""
echo "Next steps:"
echo "1. Monitor GitHub Actions: https://github.com/miaoda/miaoda-ide/actions"
echo "2. Verify VSCode Marketplace: https://marketplace.visualstudio.com/publishers/miaoda"
echo "3. Verify Open VSX: https://open-vsx.org/namespace/miaoda"
echo "4. Verify GitHub Release: https://github.com/miaoda/miaoda-ide/releases/tag/v$VERSION"
echo ""
echo "🚀 Miaoda IDE v$VERSION - Released!"
