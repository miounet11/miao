# Release Process

This document describes the release process for Miaoda IDE.

## Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Pre-1.0 Releases

- 0.9.x - Q3 2026 (Performance + New Features)
- 0.8.x - Q2 2026 (Core Innovations)
- 0.5.x - Q1 2026 (Foundation)
- 1.0.0 - 2027 Q2 (Production Ready)

## Release Schedule

- **Major**: Yearly (1.0, 2.0, 3.0)
- **Minor**: Quarterly (0.8.0, 0.9.0, 0.10.0)
- **Patch**: As needed (0.9.1, 0.9.2)

## Release Checklist

### 1. Pre-Release (1 week before)

- [ ] Create release branch: `release/v0.9.0`
- [ ] Update version in all package.json files
- [ ] Update CHANGELOG.md with release notes
- [ ] Run full test suite
- [ ] Build all extensions
- [ ] Test in clean environment
- [ ] Update documentation
- [ ] Create release PR

### 2. Release Day

- [ ] Merge release PR to main
- [ ] Create git tag: `git tag -a v0.9.0 -m "Release v0.9.0"`
- [ ] Push tag: `git push origin v0.9.0`
- [ ] GitHub Actions builds and publishes
- [ ] Create GitHub Release with notes
- [ ] Announce on Twitter/Discord
- [ ] Update website

### 3. Post-Release

- [ ] Monitor for critical issues
- [ ] Respond to user feedback
- [ ] Plan next release
- [ ] Update roadmap

## Release Commands

```bash
# Update version
npm version minor  # 0.8.0 -> 0.9.0
npm version patch  # 0.9.0 -> 0.9.1

# Build all
npm run compile

# Test all
npm test

# Create tag
git tag -a v0.9.0 -m "Release v0.9.0"
git push origin v0.9.0
```

## Hotfix Process

For critical bugs:

1. Create hotfix branch from main: `hotfix/v0.9.1`
2. Fix bug and test
3. Update CHANGELOG.md
4. Merge to main and tag
5. Release immediately

## Release Notes Template

```markdown
## [0.9.0] - 2026-02-23

### Added
- New feature 1
- New feature 2

### Improved
- Enhancement 1
- Enhancement 2

### Fixed
- Bug fix 1
- Bug fix 2

### Breaking Changes
- None
```

## Automation

GitHub Actions automatically:
- Runs tests on PR
- Builds extensions on merge
- Publishes on tag push
- Creates GitHub Release

See `.github/workflows/` for details.
