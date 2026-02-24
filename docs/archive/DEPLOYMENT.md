# Miaoda IDE Deployment Guide

## 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Miaoda IDE 部署架构                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│   客户端      │
│  (Electron)  │
└──────┬───────┘
       │
       ├─────────────────┬─────────────────┬──────────────┐
       ↓                 ↓                 ↓              ↓
┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐
│ Auth API     │  │ License API  │  │ LLM API  │  │Telemetry │
│ /auth/*      │  │ /licenses/*  │  │ /llm/*   │  │/telemetry│
└──────────────┘  └──────────────┘  └──────────┘  └──────────┘
       │                 │                 │              │
       └─────────────────┴─────────────────┴──────────────┘
                              ↓
                    ┌──────────────────┐
                    │   Backend API    │
                    │ api.miaoda.com   │
                    └──────────────────┘
                              ↓
                    ┌──────────────────┐
                    │    Database      │
                    │   (PostgreSQL)   │
                    └──────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    更新服务器                                 │
│              releases.miaoda.com                             │
│                                                              │
│  /latest-mac.yml                                            │
│  /latest.yml                                                │
│  /latest-linux.yml                                          │
│  /Miaoda-IDE-*.dmg                                          │
│  /Miaoda-IDE-*.exe                                          │
│  /Miaoda-IDE-*.AppImage                                     │
└──────────────────────────────────────────────────────────────┘
```

## 前置要求

### 开发环境

- Node.js >= 18.x
- npm >= 9.x
- Git
- Code signing certificates (生产环境)

### 服务器环境

- Backend API 服务器
- 更新服务器（CDN）
- 数据库服务器
- 遥测服务器

## 构建流程

### 1. 准备构建环境

```bash
# 克隆仓库
git clone https://github.com/miaoda/miaoda-ide.git
cd miaoda-ide

# 安装依赖
npm install
cd extensions && npm install

# 编译所有扩展
npm run compile-all
```

### 2. 配置环境变量

```bash
# .env.production
API_BASE_URL=https://api.miaoda.com
UPDATE_SERVER_URL=https://releases.miaoda.com
TELEMETRY_URL=https://telemetry.miaoda.com

# 代码签名（可选）
APPLE_ID=your@email.com
APPLE_ID_PASSWORD=@keychain:AC_PASSWORD
WINDOWS_CERT_PASSWORD=your-cert-password
```

### 3. 构建应用

#### macOS

```bash
# 构建 DMG 和 ZIP
npm run build:mac

# 输出文件
# dist/Miaoda-IDE-1.0.0-mac-x64.dmg
# dist/Miaoda-IDE-1.0.0-mac-arm64.dmg
# dist/Miaoda-IDE-1.0.0-mac-x64.zip
# dist/Miaoda-IDE-1.0.0-mac-arm64.zip
```

#### Windows

```bash
# 构建 EXE 和 ZIP
npm run build:win

# 输出文件
# dist/Miaoda-IDE-1.0.0-win-x64.exe
# dist/Miaoda-IDE-1.0.0-win-arm64.exe
# dist/Miaoda-IDE-1.0.0-win-x64.zip
# dist/Miaoda-IDE-1.0.0-win-arm64.zip
```

#### Linux

```bash
# 构建 DEB, RPM, AppImage
npm run build:linux

# 输出文件
# dist/Miaoda-IDE-1.0.0-linux-x64.deb
# dist/Miaoda-IDE-1.0.0-linux-x64.rpm
# dist/Miaoda-IDE-1.0.0-linux-x64.AppImage
```

### 4. 代码签名

#### macOS 签名和公证

```bash
# 1. 签名应用
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: Your Name (TEAM_ID)" \
  --options runtime \
  --entitlements build/entitlements.mac.plist \
  "dist/Miaoda IDE.app"

# 2. 创建 DMG
hdiutil create -volname "Miaoda IDE" \
  -srcfolder "dist/Miaoda IDE.app" \
  -ov -format UDZO \
  "dist/Miaoda-IDE-1.0.0-mac-x64.dmg"

# 3. 签名 DMG
codesign --sign "Developer ID Application: Your Name (TEAM_ID)" \
  "dist/Miaoda-IDE-1.0.0-mac-x64.dmg"

# 4. 公证
xcrun altool --notarize-app \
  --primary-bundle-id "com.miaoda.ide" \
  --username "your@email.com" \
  --password "@keychain:AC_PASSWORD" \
  --file "dist/Miaoda-IDE-1.0.0-mac-x64.dmg"

# 5. 等待公证完成（通常 5-10 分钟）
xcrun altool --notarization-info <request-uuid> \
  --username "your@email.com" \
  --password "@keychain:AC_PASSWORD"

# 6. 装订公证票据
xcrun stapler staple "dist/Miaoda-IDE-1.0.0-mac-x64.dmg"

# 7. 验证
spctl -a -t open --context context:primary-signature -v \
  "dist/Miaoda-IDE-1.0.0-mac-x64.dmg"
```

#### Windows 签名

```bash
# 使用 SignTool
signtool sign /f certificate.pfx \
  /p "$WINDOWS_CERT_PASSWORD" \
  /tr http://timestamp.digicert.com \
  /td sha256 \
  /fd sha256 \
  "dist/Miaoda-IDE-1.0.0-win-x64.exe"

# 验证签名
signtool verify /pa /v "dist/Miaoda-IDE-1.0.0-win-x64.exe"
```

## 部署更新服务器

### 1. 准备更新元数据

#### latest-mac.yml

```yaml
version: 1.0.0
files:
  - url: Miaoda-IDE-1.0.0-mac-x64.dmg
    sha512: <sha512-hash>
    size: 123456789
  - url: Miaoda-IDE-1.0.0-mac-arm64.dmg
    sha512: <sha512-hash>
    size: 123456789
path: Miaoda-IDE-1.0.0-mac-x64.dmg
sha512: <sha512-hash>
releaseDate: '2024-02-24T00:00:00.000Z'
```

#### latest.yml (Windows)

```yaml
version: 1.0.0
files:
  - url: Miaoda-IDE-1.0.0-win-x64.exe
    sha512: <sha512-hash>
    size: 123456789
path: Miaoda-IDE-1.0.0-win-x64.exe
sha512: <sha512-hash>
releaseDate: '2024-02-24T00:00:00.000Z'
```

#### latest-linux.yml

```yaml
version: 1.0.0
files:
  - url: Miaoda-IDE-1.0.0-linux-x64.AppImage
    sha512: <sha512-hash>
    size: 123456789
path: Miaoda-IDE-1.0.0-linux-x64.AppImage
sha512: <sha512-hash>
releaseDate: '2024-02-24T00:00:00.000Z'
```

### 2. 上传到 CDN

```bash
# 使用 AWS S3
aws s3 sync dist/ s3://releases.miaoda.com/ \
  --exclude "*" \
  --include "*.dmg" \
  --include "*.exe" \
  --include "*.AppImage" \
  --include "*.yml" \
  --acl public-read

# 设置 CloudFront 缓存
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

### 3. 配置 CDN

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name releases.miaoda.com;

    ssl_certificate /etc/ssl/certs/miaoda.crt;
    ssl_certificate_key /etc/ssl/private/miaoda.key;

    root /var/www/releases;

    location / {
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=3600";
    }

    location ~ \.(dmg|exe|AppImage)$ {
        add_header Content-Disposition "attachment";
        add_header Cache-Control "public, max-age=86400";
    }
}
```

## CI/CD 配置

### GitHub Actions

```yaml
# .github/workflows/release.yml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          npm ci
          cd extensions && npm ci

      - name: Build
        run: npm run build:mac
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: mac-build
          path: dist/*.dmg

  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          npm ci
          cd extensions && npm ci

      - name: Build
        run: npm run build:win
        env:
          WINDOWS_CERT_PASSWORD: ${{ secrets.WINDOWS_CERT_PASSWORD }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: windows-build
          path: dist/*.exe

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          npm ci
          cd extensions && npm ci

      - name: Build
        run: npm run build:linux

      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: linux-build
          path: |
            dist/*.deb
            dist/*.rpm
            dist/*.AppImage

  release:
    needs: [build-mac, build-windows, build-linux]
    runs-on: ubuntu-latest
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v3

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            mac-build/*
            windows-build/*
            linux-build/*
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload to CDN
        run: |
          aws s3 sync . s3://releases.miaoda.com/ \
            --exclude "*" \
            --include "*.dmg" \
            --include "*.exe" \
            --include "*.AppImage" \
            --acl public-read
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## 监控和日志

### 1. 应用监控

```typescript
// 集成 Sentry
import * as Sentry from '@sentry/electron';

Sentry.init({
  dsn: 'https://xxx@sentry.io/xxx',
  environment: 'production',
  release: '1.0.0',
});
```

### 2. 遥测数据

- 崩溃报告：`POST /api/v1/telemetry/crash`
- 使用统计：`POST /api/v1/telemetry/events`
- 性能指标：`POST /api/v1/telemetry/performance`

### 3. 日志聚合

```bash
# 使用 CloudWatch Logs
aws logs create-log-group --log-group-name /miaoda/ide
aws logs create-log-stream \
  --log-group-name /miaoda/ide \
  --log-stream-name production
```

## 回滚策略

### 1. 快速回滚

```bash
# 更新 latest.yml 指向旧版本
cp latest-1.0.0.yml latest.yml
aws s3 cp latest.yml s3://releases.miaoda.com/
```

### 2. 分阶段发布

```yaml
# 10% 用户
rollout:
  percentage: 10
  version: 1.1.0

# 监控 24 小时后增加到 50%
rollout:
  percentage: 50
  version: 1.1.0

# 再监控 24 小时后全量发布
rollout:
  percentage: 100
  version: 1.1.0
```

## 安全检查清单

- [ ] 代码签名证书有效
- [ ] HTTPS 证书有效
- [ ] API 密钥已轮换
- [ ] 依赖项已更新
- [ ] 安全扫描通过
- [ ] 渗透测试完成
- [ ] 备份已创建
- [ ] 回滚计划已准备

## 故障排查

### 自动更新失败

1. 检查更新服务器可访问性
2. 验证 latest.yml 格式
3. 检查文件 SHA512 哈希
4. 查看客户端日志

### 代码签名失败

1. 验证证书有效期
2. 检查证书密码
3. 确认 entitlements 配置
4. 查看签名日志

### 公证失败

1. 检查 Apple ID 凭据
2. 验证 Bundle ID
3. 查看公证日志
4. 确认 hardened runtime

## 联系方式

- DevOps: devops@miaoda.com
- Security: security@miaoda.com
- Support: support@miaoda.com
