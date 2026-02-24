#!/bin/bash
set -e

EXTENSIONS_DIR="extensions"
OUTPUT_DIR="dist/extensions"
CORE_EXTENSIONS=(
  "agent-orchestrator"
  "agent-chat-panel"
  "skills-manager"
)

echo "🚀 Packaging Miaoda IDE extensions..."

# 清理输出目录
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# 打包每个扩展
for ext in "${CORE_EXTENSIONS[@]}"; do
  echo "📦 Packaging $ext..."
  cd "$EXTENSIONS_DIR/$ext"

  # 安装依赖
  if [ -f "package.json" ]; then
    npm install --production
    npx vsce package --out "../../$OUTPUT_DIR/$ext.vsix"
  fi

  cd ../..
done

# 打包主扩展包
echo "📦 Packaging miaoda-ide extension pack..."
cd "$EXTENSIONS_DIR/miaoda-ide"
npx vsce package --out "../../$OUTPUT_DIR/miaoda-ide.vsix"
cd ../..

echo "✅ All extensions packaged to $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"
