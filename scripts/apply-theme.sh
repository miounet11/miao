#!/bin/bash

# Miaoda IDE Theme Application Script
# Applies custom theme and styles to the IDE

set -e

echo "🎨 Applying Miaoda Theme..."

# Colors
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${PURPLE}Project root: ${PROJECT_ROOT}${NC}"

# Check if theme extension exists
THEME_DIR="${PROJECT_ROOT}/extensions/theme-miaoda"
if [ ! -d "$THEME_DIR" ]; then
    echo -e "${YELLOW}⚠️  Theme extension not found at ${THEME_DIR}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Theme extension found${NC}"

# Copy theme to built extensions if needed
OUT_DIR="${PROJECT_ROOT}/out/extensions/theme-miaoda"
if [ -d "${PROJECT_ROOT}/out" ]; then
    echo "📦 Copying theme to output directory..."
    mkdir -p "$OUT_DIR"
    cp -r "${THEME_DIR}/"* "$OUT_DIR/"
    echo -e "${GREEN}✓ Theme copied to output${NC}"
fi

# Create default settings if not exists
SETTINGS_FILE="${PROJECT_ROOT}/.vscode/settings.json"
if [ ! -f "$SETTINGS_FILE" ]; then
    echo "⚙️  Creating default settings..."
    mkdir -p "${PROJECT_ROOT}/.vscode"
    cat > "$SETTINGS_FILE" << 'SETTINGS'
{
  "workbench.colorTheme": "Miaoda Dark",
  "workbench.iconTheme": "vs-seti",
  "editor.fontSize": 13,
  "editor.lineHeight": 1.5,
  "editor.fontFamily": "'SF Mono', 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace",
  "editor.fontLigatures": true,
  "editor.cursorBlinking": "smooth",
  "editor.cursorSmoothCaretAnimation": "on",
  "editor.smoothScrolling": true,
  "terminal.integrated.fontSize": 12,
  "terminal.integrated.fontFamily": "'SF Mono', 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace",
  "miaoda.autoApplyCustomStyles": true,
  "miaoda.customStyles": true
}
SETTINGS
    echo -e "${GREEN}✓ Default settings created${NC}"
else
    echo -e "${GREEN}✓ Settings file exists${NC}"
fi

# Show theme info
echo ""
echo -e "${PURPLE}╔════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                                        ║${NC}"
echo -e "${PURPLE}║        🎨 Miaoda Theme Applied         ║${NC}"
echo -e "${PURPLE}║                                        ║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Theme Features:${NC}"
echo "  • Cursor-inspired gradient design"
echo "  • Compact UI (13px editor, 12px sidebar)"
echo "  • Next-gen button styling"
echo "  • Smooth animations"
echo ""
echo -e "${YELLOW}To activate:${NC}"
echo "  1. Launch Miaoda IDE"
echo "  2. Press Cmd+Shift+P (or Ctrl+Shift+P)"
echo "  3. Type 'Color Theme'"
echo "  4. Select 'Miaoda Dark' or 'Miaoda Light'"
echo ""
echo -e "${GREEN}✨ Enjoy coding with Miaoda!${NC}"
