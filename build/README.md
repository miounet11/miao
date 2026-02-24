# Miaoda IDE Build Configuration

Electron Builder configuration for cross-platform packaging.

## Prerequisites

```bash
npm install -g electron-builder
```

## Build Commands

### Development Build

```bash
# Build for current platform
npm run build

# Build and package
npm run package
```

### Production Build

```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux

# All platforms
npm run build:all
```

## Code Signing

### macOS

1. Obtain Apple Developer certificate
2. Install certificate in Keychain
3. Update `electron-builder.config.ts`:
   ```typescript
   mac: {
     identity: 'Developer ID Application: Your Name (TEAM_ID)',
   }
   ```
4. Build:
   ```bash
   npm run build:mac
   ```

### Windows

1. Obtain Authenticode certificate (.pfx)
2. Set environment variable:
   ```bash
   export WINDOWS_CERT_PASSWORD="your-password"
   ```
3. Update `electron-builder.config.ts`:
   ```typescript
   win: {
     certificateFile: 'path/to/certificate.pfx',
     certificatePassword: process.env.WINDOWS_CERT_PASSWORD,
   }
   ```
4. Build:
   ```bash
   npm run build:win
   ```

## Auto-Update

The app is configured to check for updates from:
```
https://releases.miaoda.com
```

Update server should serve:
- `latest-mac.yml` - macOS update metadata
- `latest.yml` - Windows update metadata
- `latest-linux.yml` - Linux update metadata
- Binary files (`.dmg`, `.exe`, `.AppImage`, etc.)

## Output

Built artifacts are placed in `dist/` directory:

```
dist/
├── Miaoda-IDE-1.0.0-mac-x64.dmg
├── Miaoda-IDE-1.0.0-mac-arm64.dmg
├── Miaoda-IDE-1.0.0-win-x64.exe
├── Miaoda-IDE-1.0.0-linux-x64.deb
└── ...
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Package
        run: npm run package
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: dist/*
```

## Troubleshooting

### macOS Notarization

If notarization fails:
```bash
# Check notarization status
xcrun altool --notarization-info <request-uuid> \
  --username "your@email.com" \
  --password "@keychain:AC_PASSWORD"
```

### Windows Signing

If signing fails:
```bash
# Verify certificate
signtool verify /pa /v path/to/app.exe
```

### Linux AppImage

If AppImage doesn't run:
```bash
# Make executable
chmod +x Miaoda-IDE-*.AppImage

# Run with FUSE
./Miaoda-IDE-*.AppImage --appimage-extract-and-run
```
