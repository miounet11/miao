#!/bin/bash
# Package IDE for Distribution
# Creates platform-specific packages for Linux, macOS, and Windows

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$ROOT_DIR"

echo "====================================="
echo "  Miaoda IDE - Package for Distribution"
echo "====================================="
echo ""

# Read version from package.json
VERSION=$(node -p "require('./package.json').version")
PRODUCT_NAME=$(node -p "require('./product.json').nameLong")

echo "Product: $PRODUCT_NAME"
echo "Version: $VERSION"
echo ""

# Platform detection
PLATFORM="${PLATFORM:-$(uname -s | tr '[:upper:]' '[:lower:]')}"
ARCH="${ARCH:-x64}"

echo "Target Platform: $PLATFORM"
echo "Target Architecture: $ARCH"
echo ""

# Create package directory
PACKAGE_DIR="dist/packages/$PLATFORM-$ARCH"
mkdir -p "$PACKAGE_DIR"

# Function to create Linux package
package_linux() {
    echo "Creating Linux package..."

    APP_DIR="$PACKAGE_DIR/miaoda-ide-$VERSION"
    mkdir -p "$APP_DIR"

    # Copy application files
    cp -r out/ "$APP_DIR/"
    cp -r extensions/ "$APP_DIR/"
    cp -r resources/ "$APP_DIR/"
    cp -r node_modules/ "$APP_DIR/"
    cp package.json product.json LICENSE.txt README.md "$APP_DIR/"

    # Create launcher script
    cat > "$APP_DIR/miaoda" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/out/cli.js" "$@"
EOF
    chmod +x "$APP_DIR/miaoda"

    # Create desktop entry
    mkdir -p "$APP_DIR/share/applications"
    cat > "$APP_DIR/share/applications/miaoda.desktop" << EOF
[Desktop Entry]
Name=Miaoda IDE
Comment=Code Editor
Exec=/opt/miaoda/miaoda %F
Icon=miaoda
Type=Application
Categories=Development;IDE;
MimeType=text/plain;
EOF

    # Create tarball
    cd "$PACKAGE_DIR"
    tar -czf "miaoda-ide-$VERSION-linux-$ARCH.tar.gz" "miaoda-ide-$VERSION/"
    rm -rf "miaoda-ide-$VERSION/"
    cd "$ROOT_DIR"

    echo "Linux package created: $PACKAGE_DIR/miaoda-ide-$VERSION-linux-$ARCH.tar.gz"
}

# Function to create macOS package
package_darwin() {
    echo "Creating macOS package..."

    APP_DIR="$PACKAGE_DIR/Miaoda.app"
    mkdir -p "$APP_DIR/Contents/MacOS"
    mkdir -p "$APP_DIR/Contents/Resources"

    # Copy application files
    cp -r out/ "$APP_DIR/Contents/Resources/"
    cp -r extensions/ "$APP_DIR/Contents/Resources/"
    cp -r resources/ "$APP_DIR/Contents/Resources/"
    cp -r node_modules/ "$APP_DIR/Contents/Resources/"
    cp package.json product.json "$APP_DIR/Contents/Resources/"

    # Create Info.plist
    cat > "$APP_DIR/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>Miaoda</string>
    <key>CFBundleIdentifier</key>
    <string>com.miaoda.ide</string>
    <key>CFBundleName</key>
    <string>Miaoda IDE</string>
    <key>CFBundleVersion</key>
    <string>$VERSION</string>
    <key>CFBundleShortVersionString</key>
    <string>$VERSION</string>
</dict>
</plist>
EOF

    # Create launcher
    cat > "$APP_DIR/Contents/MacOS/Miaoda" << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$DIR/../Resources/out/cli.js" "$@"
EOF
    chmod +x "$APP_DIR/Contents/MacOS/Miaoda"

    # Create DMG
    cd "$PACKAGE_DIR"
    hdiutil create -volname "Miaoda IDE" -srcfolder "Miaoda.app" -ov -format UDZO "miaoda-ide-$VERSION-darwin-$ARCH.dmg"
    rm -rf "Miaoda.app"
    cd "$ROOT_DIR"

    echo "macOS package created: $PACKAGE_DIR/miaoda-ide-$VERSION-darwin-$ARCH.dmg"
}

# Function to create Windows package
package_win32() {
    echo "Creating Windows package..."

    APP_DIR="$PACKAGE_DIR/miaoda-ide-$VERSION"
    mkdir -p "$APP_DIR"

    # Copy application files
    cp -r out/ "$APP_DIR/"
    cp -r extensions/ "$APP_DIR/"
    cp -r resources/ "$APP_DIR/"
    cp -r node_modules/ "$APP_DIR/"
    cp package.json product.json LICENSE.txt README.md "$APP_DIR/"

    # Create launcher batch file
    cat > "$APP_DIR/miaoda.bat" << 'EOF'
@echo off
setlocal
set SCRIPT_DIR=%~dp0
node "%SCRIPT_DIR%out\cli.js" %*
EOF

    # Create zip archive
    cd "$PACKAGE_DIR"
    zip -r "miaoda-ide-$VERSION-win32-$ARCH.zip" "miaoda-ide-$VERSION/"
    rm -rf "miaoda-ide-$VERSION/"
    cd "$ROOT_DIR"

    echo "Windows package created: $PACKAGE_DIR/miaoda-ide-$VERSION-win32-$ARCH.zip"
}

# Package based on platform
case "$PLATFORM" in
    linux)
        package_linux
        ;;
    darwin)
        package_darwin
        ;;
    win32|windows)
        package_win32
        ;;
    *)
        echo "Error: Unsupported platform: $PLATFORM"
        echo "Supported platforms: linux, darwin, win32"
        exit 1
        ;;
esac

# Generate checksums
echo ""
echo "Generating checksums..."
cd "$PACKAGE_DIR"
sha256sum * > checksums.txt 2>/dev/null || shasum -a 256 * > checksums.txt
cd "$ROOT_DIR"

echo ""
echo "====================================="
echo "  Packaging Complete!"
echo "====================================="
echo ""
echo "Package location: $PACKAGE_DIR"
ls -lh "$PACKAGE_DIR"
echo ""
echo "Packaging completed successfully!"
