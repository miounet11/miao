# Multi-Platform Release Guide

## 🌍 Supported Platforms

Miaoda IDE is published to multiple platforms for maximum reach:

1. **VSCode Marketplace** (Primary)
2. **Open VSX Registry** (VSCodium, Eclipse Theia)
3. **GitHub Releases** (Direct download)
4. **npm Registry** (API package)

---

## 📦 Platform Details

### 1. VSCode Marketplace

**URL**: https://marketplace.visualstudio.com/publishers/miaoda

**Audience**: VSCode users (largest audience)

**Installation**:
```bash
# Via VSCode
Ext + Install Extension -> Search "Miaoda IDE"

# Via CLI
code --install-extension miaoda.context-engine
code --install-extension miaoda.cost-optimizer
code --install-extension miaoda.quality-guardian
code --install-extension miaoda.hybrid-model
code --install-extension miaoda.knowledge-graph
code --install-extension miaoda.embedding-service
```

**Publishing**:
- Automated via GitHub Actions
- Requires VSCE_TOKEN secret
- Triggered on git tag push

---

### 2. Open VSX Registry

**URL**: https://open-vsx.org/namespace/miaoda

**Audience**: VSCodium, Eclipse Theia, Gitpod users

**Why Open VSX**:
- Open source alternative to VSCode Marketplace
- Required for VSCodium (VSCode without telemetry)
- Used by Eclipse Theia, Gitpod, and other VS Code forks

**Installation**:
```bash
# Via VSCodium
Ext + Install Extension -> Search "Miaoda IDE"

# Via CLI
codium --install-extension miaoda.context-engine
```

**Publishing**:
- Automated via GitHub Actions
- Requires OVSX_TOKEN secret
- Same .vsix files as VSCode Marketplace

---

### 3. GitHub Releases

**URL**: https://github.com/miaoda/miaoda-ide/releases

**Audience**: 
- Users who prefer manual installation
- Enterprise users with restricted marketplace access
- Developers and contributors

**Installation**:
```bash
# Download .vsix files from GitHub Releases
# Then install via VSCode
code --install-extension path/to/extension.vsix
```

**Publishing**:
- Automated via GitHub Actions
- Creates release with all .vsix files
- Includes release notes

---

### 4. npm Registry

**URL**: https://www.npmjs.com/package/@miaoda/api

**Audience**: 
- Extension developers
- Users building on Miaoda API
- Integration developers

**Installation**:
```bash
npm install @miaoda/api
```

**Publishing**:
- Automated for stable releases (1.0.0+)
- Manual for beta releases
- Only publishes @miaoda/api package

---

## 🔐 Required Secrets

### GitHub Repository Secrets

Set these in: Settings → Secrets and variables → Actions

1. **VSCE_TOKEN**
   - VSCode Marketplace Personal Access Token
   - Get from: https://marketplace.visualstudio.com/manage
   - Permissions: Marketplace (Publish)

2. **OVSX_TOKEN**
   - Open VSX Personal Access Token
   - Get from: https://open-vsx.org/user-settings/tokens
   - Permissions: Publish extensions

3. **NPM_TOKEN**
   - npm Personal Access Token
   - Get from: https://www.npmjs.com/settings/[username]/tokens
   - Type: Automation

4. **GITHUB_TOKEN**
   - Automatically provided by GitHub Actions
   - No setup required

---

## 🚀 Release Process

### Automated Release (Recommended)

```bash
# 1. Create and push tag
git tag -a v0.9.0 -m "Release v0.9.0"
git push origin v0.9.0

# 2. GitHub Actions automatically:
#    - Builds all extensions
#    - Packages .vsix files
#    - Publishes to VSCode Marketplace
#    - Publishes to Open VSX
#    - Creates GitHub Release
#    - Publishes to npm (for stable releases)
```

### Manual Release (Fallback)

```bash
# 1. Build extensions
cd extensions/context-engine && npm run compile
cd ../cost-optimizer && npm run compile
# ... repeat for all extensions

# 2. Package extensions
npm install -g @vscode/vsce ovsx
cd extensions/context-engine && vsce package
cd ../cost-optimizer && vsce package
# ... repeat for all extensions

# 3. Publish to VSCode Marketplace
vsce publish -p YOUR_VSCE_TOKEN

# 4. Publish to Open VSX
ovsx publish extension.vsix -p YOUR_OVSX_TOKEN

# 5. Create GitHub Release manually
# Upload .vsix files to GitHub Releases page

# 6. Publish to npm (optional)
cd packages/api
npm publish
```

---

## 📊 Platform Comparison

| Feature | VSCode | Open VSX | GitHub | npm |
|---------|--------|----------|--------|-----|
| Auto-update | ✅ | ✅ | ❌ | ❌ |
| Discovery | ✅ | ✅ | ⚠️ | ⚠️ |
| Analytics | ✅ | ⚠️ | ✅ | ✅ |
| Audience | Largest | Medium | Small | Developers |
| Required | Yes | Yes | Yes | Optional |

---

## 🎯 Platform Strategy

### Primary: VSCode Marketplace
- Largest user base
- Best discovery
- Automatic updates
- Priority support

### Secondary: Open VSX
- Open source community
- VSCodium users
- Enterprise users
- Same-day releases

### Tertiary: GitHub Releases
- Direct downloads
- Version archive
- Enterprise offline installs
- Developer access

### Optional: npm
- API consumers
- Extension developers
- Integration partners
- Stable releases only

---

## 📈 Success Metrics

### VSCode Marketplace
- Downloads per week
- Active installs
- Rating (target: 4.5+)
- Reviews

### Open VSX
- Downloads per week
- Active installs

### GitHub Releases
- Download count per release
- Stars
- Forks
- Contributors

### npm
- Weekly downloads
- Dependents

---

## 🐛 Troubleshooting

### VSCode Marketplace Publish Fails

```bash
# Check token
vsce verify-pat miaoda

# Manually publish
vsce publish -p YOUR_TOKEN
```

### Open VSX Publish Fails

```bash
# Check token
ovsx verify-pat

# Manually publish
ovsx publish extension.vsix -p YOUR_TOKEN
```

### GitHub Release Fails

- Check GITHUB_TOKEN permissions
- Verify tag exists
- Check release notes file exists

---

## 📞 Support

### VSCode Marketplace Issues
- Email: vsmarketplace@microsoft.com
- Docs: https://code.visualstudio.com/api/working-with-extensions/publishing-extension

### Open VSX Issues
- GitHub: https://github.com/eclipse/openvsx/issues
- Docs: https://github.com/eclipse/openvsx/wiki

### npm Issues
- Support: https://www.npmjs.com/support
- Docs: https://docs.npmjs.com/

---

## ✅ Pre-Release Checklist

- [ ] All extensions compile successfully
- [ ] Version numbers updated
- [ ] CHANGELOG.md updated
- [ ] Release notes written
- [ ] Secrets configured in GitHub
- [ ] Test build locally
- [ ] Git tag created
- [ ] Ready to push

---

## 🎊 Post-Release Checklist

- [ ] Verify VSCode Marketplace listing
- [ ] Verify Open VSX listing
- [ ] Verify GitHub Release
- [ ] Test installation from each platform
- [ ] Announce release
- [ ] Monitor for issues

---

**Last Updated**: 2026-02-23
