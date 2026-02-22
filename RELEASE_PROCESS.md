# Miaoda IDE - Release Process

Standardized process for releasing new versions of Miaoda IDE.

## Release Types

### Patch Release (x.x.X)
- Bug fixes
- Security patches
- Minor improvements
- No breaking changes

### Minor Release (x.X.0)
- New features
- Enhancements
- Deprecations
- Backward compatible

### Major Release (X.0.0)
- Breaking changes
- Major features
- Architecture changes
- API changes

## Release Schedule

- **Patch releases**: As needed (security/critical bugs)
- **Minor releases**: Monthly
- **Major releases**: Quarterly or as needed

## Pre-Release Checklist

### Code Quality

- [ ] All tests passing
- [ ] Code coverage > 80%
- [ ] No critical security vulnerabilities
- [ ] Code review completed
- [ ] Documentation updated
- [ ] CHANGELOG.md updated

### Testing

- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance tests passing
- [ ] Security scan completed
- [ ] Browser compatibility tested

### Documentation

- [ ] README.md updated
- [ ] API documentation updated
- [ ] User guide updated
- [ ] Migration guide created (if needed)
- [ ] Release notes drafted

## Release Steps

### 1. Prepare Release Branch

```bash
# Create release branch
git checkout -b release/v1.2.0 develop

# Update version in package.json
npm version minor  # or patch, major

# Update CHANGELOG.md
vim CHANGELOG.md

# Commit changes
git add .
git commit -m "chore: prepare release v1.2.0"

# Push release branch
git push origin release/v1.2.0
```

### 2. Update CHANGELOG

```markdown
## [1.2.0] - 2024-01-15

### Added
- New feature: Multi-agent orchestration
- Support for custom extensions
- Real-time collaboration

### Changed
- Improved performance by 30%
- Updated UI components
- Enhanced error messages

### Fixed
- Fixed memory leak in extension host
- Resolved WebSocket connection issues
- Fixed database locking problems

### Security
- Updated dependencies with security patches
- Fixed XSS vulnerability in markdown preview

### Deprecated
- Old API endpoints (will be removed in v2.0.0)

### Breaking Changes
- None
```

### 3. Run Full Test Suite

```bash
# Run all tests
yarn test
yarn test-node
yarn test-browser

# Run integration tests
yarn test-integration

# Run linting
yarn eslint

# Run type checking
yarn monaco-compile-check
yarn vscode-dts-compile-check
```

### 4. Build Release Artifacts

```bash
# Build all components
bash scripts/deploy/build-all.sh

# Package for distribution
bash scripts/deploy/package-ide.sh

# Verify artifacts
ls -lh dist/
```

### 5. Create Release Tag

```bash
# Merge to main
git checkout main
git merge --no-ff release/v1.2.0

# Create annotated tag
git tag -a v1.2.0 -m "Release version 1.2.0

Changes:
- Feature A
- Feature B
- Bug fix C
"

# Push to remote
git push origin main
git push origin v1.2.0
```

### 6. GitHub Release

The GitHub Actions workflow will automatically:
- Build artifacts
- Run tests
- Create Docker images
- Create GitHub release
- Deploy to production

Manual steps:

```bash
# Or create release manually
gh release create v1.2.0 \
  --title "Miaoda IDE v1.2.0" \
  --notes-file RELEASE_NOTES.md \
  dist/ide/*.tar.gz \
  dist/server/*.tar.gz
```

### 7. Deploy to Production

```bash
# Automatic deployment via GitHub Actions
# Or manual deployment:

DEPLOY_HOST=production.example.com \
DEPLOY_USER=miaoda \
bash scripts/deploy/deploy-cloud.sh
```

### 8. Verify Deployment

```bash
# Run health checks
bash scripts/deploy/health-check.sh

# Check version
curl https://your-domain.com/api/version

# Monitor logs
ssh user@server 'sudo journalctl -u miaoda-server -f'

# Check metrics
# Visit Grafana dashboard
```

### 9. Post-Release Tasks

```bash
# Merge back to develop
git checkout develop
git merge --no-ff main
git push origin develop

# Delete release branch
git branch -d release/v1.2.0
git push origin --delete release/v1.2.0

# Update documentation site
# Deploy updated docs
```

### 10. Announce Release

- [ ] Update website
- [ ] Post on social media
- [ ] Send email to users
- [ ] Update status page
- [ ] Notify partners/integrators
- [ ] Update marketplace listings

## Hotfix Process

For critical bugs in production:

### 1. Create Hotfix Branch

```bash
# Create from main
git checkout -b hotfix/v1.2.1 main

# Fix the issue
vim src/critical-bug.ts

# Test the fix
yarn test

# Commit
git commit -am "fix: critical bug in authentication"
```

### 2. Release Hotfix

```bash
# Update version
npm version patch

# Update CHANGELOG
echo "## [1.2.1] - $(date +%Y-%m-%d)\n### Fixed\n- Critical authentication bug" >> CHANGELOG.md

# Merge to main
git checkout main
git merge --no-ff hotfix/v1.2.1

# Tag
git tag -a v1.2.1 -m "Hotfix: Critical authentication bug"

# Push
git push origin main v1.2.1

# Merge back to develop
git checkout develop
git merge --no-ff hotfix/v1.2.1
git push origin develop

# Delete hotfix branch
git branch -d hotfix/v1.2.1
```

### 3. Deploy Immediately

```bash
# Deploy hotfix
DEPLOY_HOST=production.example.com bash scripts/deploy/deploy-cloud.sh

# Verify fix
bash scripts/deploy/health-check.sh
```

## Rollback Process

### When to Rollback

- Critical bugs in production
- Security vulnerabilities
- Data corruption
- Service unavailability
- Performance degradation

### Rollback Steps

```bash
# 1. SSH to server
ssh user@production.example.com

# 2. Navigate to deployment directory
cd /opt/miaoda

# 3. List backups
ls -lt backup-*

# 4. Stop service
sudo systemctl stop miaoda-server

# 5. Restore previous version
rm -rf current
mv backup-20240115-120000 current

# 6. Start service
sudo systemctl start miaoda-server

# 7. Verify
curl http://localhost:3000/health

# 8. Notify team
echo "Rolled back to previous version" | mail -s "Rollback Alert" team@example.com
```

## Version Numbering

Follow Semantic Versioning (SemVer):

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes
MINOR: New features (backward compatible)
PATCH: Bug fixes (backward compatible)
```

Examples:
- `1.0.0` → `1.0.1` (bug fix)
- `1.0.1` → `1.1.0` (new feature)
- `1.1.0` → `2.0.0` (breaking change)

## Release Notes Template

```markdown
# Miaoda IDE v1.2.0

Released: January 15, 2024

## Highlights

- 🎉 New multi-agent orchestration system
- ⚡ 30% performance improvement
- 🔒 Enhanced security features

## What's New

### Features

- **Multi-Agent Orchestration**: Coordinate multiple AI agents for complex tasks
- **Real-time Collaboration**: Work together with your team in real-time
- **Custom Extensions**: Build and share your own extensions

### Improvements

- Faster startup time
- Reduced memory usage
- Better error messages
- Improved UI responsiveness

### Bug Fixes

- Fixed memory leak in extension host (#123)
- Resolved WebSocket connection issues (#456)
- Fixed database locking problems (#789)

## Breaking Changes

None in this release.

## Deprecations

The following features are deprecated and will be removed in v2.0.0:

- Old API endpoints (use new REST API instead)
- Legacy configuration format (migrate to new format)

## Migration Guide

No migration required for this release.

## Installation

### Docker

```bash
docker pull miaoda/miaoda-ide:v1.2.0
```

### Manual

Download from [GitHub Releases](https://github.com/miaoda/miaoda-ide/releases/tag/v1.2.0)

## Upgrade Instructions

```bash
# Backup current installation
bash scripts/backup/backup-db.sh
bash scripts/backup/backup-configs.sh

# Pull latest version
git pull origin main
git checkout v1.2.0

# Install dependencies
yarn install

# Build
yarn compile

# Restart service
sudo systemctl restart miaoda-server
```

## Known Issues

- Issue #999: Minor UI glitch in dark mode (workaround available)
- Issue #888: Slow performance with large files (fix in progress)

## Contributors

Thank you to all contributors who made this release possible!

- @contributor1
- @contributor2
- @contributor3

## Support

For issues and questions:
- GitHub Issues: https://github.com/miaoda/miaoda-ide/issues
- Documentation: https://docs.miaoda.dev
- Discord: https://discord.gg/miaoda
```

## Post-Release Monitoring

### First 24 Hours

- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Monitor resource usage
- [ ] Review user feedback
- [ ] Check for critical issues

### First Week

- [ ] Analyze usage metrics
- [ ] Review performance data
- [ ] Collect user feedback
- [ ] Plan hotfixes if needed
- [ ] Update documentation based on feedback

## Release Metrics

Track these metrics for each release:

- Time to deploy
- Number of bugs found
- Rollback rate
- User adoption rate
- Performance improvements
- User satisfaction

## Continuous Improvement

After each release:

1. Hold retrospective meeting
2. Document lessons learned
3. Update release process
4. Improve automation
5. Update documentation

## Emergency Contacts

- On-call Engineer: [phone/email]
- DevOps Lead: [phone/email]
- CTO: [phone/email]
- Support Team: [email]

## Additional Resources

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
