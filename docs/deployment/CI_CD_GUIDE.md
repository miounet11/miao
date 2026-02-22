# Miaoda IDE - CI/CD Guide

Complete guide for setting up Continuous Integration and Continuous Deployment.

## Table of Contents

1. [Overview](#overview)
2. [GitHub Actions Workflows](#github-actions-workflows)
3. [Setup Instructions](#setup-instructions)
4. [Workflow Details](#workflow-details)
5. [Secrets Configuration](#secrets-configuration)
6. [Deployment Process](#deployment-process)
7. [Troubleshooting](#troubleshooting)

## Overview

Miaoda IDE uses GitHub Actions for CI/CD with three main workflows:

1. **Test Workflow** - Runs on every push and PR
2. **Build Workflow** - Creates release artifacts
3. **Deploy Workflow** - Deploys to production

## GitHub Actions Workflows

### Workflow Files

```
.github/workflows/
├── test.yml          # Test suite
├── build.yml         # Build artifacts
└── deploy.yml        # Deploy to production
```

## Setup Instructions

### 1. Fork/Clone Repository

```bash
git clone https://github.com/miaoda/miaoda-ide.git
cd miaoda-ide
```

### 2. Configure GitHub Secrets

Go to: `Settings > Secrets and variables > Actions`

Add the following secrets:

#### Required Secrets

| Secret | Description | Example |
|--------|-------------|----------|
| `SSH_PRIVATE_KEY` | SSH key for deployment | `-----BEGIN RSA PRIVATE KEY-----...` |
| `DEPLOY_HOST` | Deployment server hostname | `server.example.com` |
| `DEPLOY_USER` | SSH user for deployment | `miaoda` |
| `DOCKER_USERNAME` | Docker Hub username | `miaoda` |
| `DOCKER_PASSWORD` | Docker Hub password/token | `dckr_pat_...` |

#### Optional Secrets

| Secret | Description |
|--------|-------------|
| `CODECOV_TOKEN` | Codecov upload token |
| `SLACK_WEBHOOK` | Slack notification webhook |
| `SENTRY_DSN` | Sentry error tracking DSN |

### 3. Generate SSH Key for Deployment

```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "github-actions@miaoda" -f ~/.ssh/miaoda-deploy

# Copy private key to GitHub Secrets (SSH_PRIVATE_KEY)
cat ~/.ssh/miaoda-deploy

# Copy public key to deployment server
ssh-copy-id -i ~/.ssh/miaoda-deploy.pub user@server.example.com
```

### 4. Configure Deployment Server

```bash
# On deployment server
sudo mkdir -p /opt/miaoda
sudo chown $USER:$USER /opt/miaoda

# Create directory structure
mkdir -p /opt/miaoda/{current,data,backups,logs}
```

### 5. Enable Workflows

Workflows are automatically enabled when you push to the repository.

## Workflow Details

### Test Workflow (`test.yml`)

**Triggers:**
- Push to `main`, `develop`, `release/**` branches
- Pull requests to `main`, `develop`

**Jobs:**

#### 1. Test Suite
- Runs on Ubuntu, Windows, macOS
- Node.js 18.x
- Executes:
  - TypeScript compilation
  - ESLint
  - Unit tests (Node.js)
  - Unit tests (Browser)
  - Coverage report

#### 2. Code Hygiene
- Hygiene checks
- Layer validation
- Git state verification

#### 3. Type Check
- Monaco type check
- vscode-dts type check
- Trusted Types check

**Example Run:**

```bash
# Manually trigger test workflow
gh workflow run test.yml

# View workflow runs
gh run list --workflow=test.yml

# View logs
gh run view <run-id> --log
```

### Build Workflow (`build.yml`)

**Triggers:**
- Push to `main`, `release/**` branches
- Tags matching `v*.*.*`
- Manual trigger

**Jobs:**

#### 1. Build Extensions
- Compiles all extensions
- Creates extension packages
- Uploads artifacts

#### 2. Build IDE
- Builds for Linux, Windows, macOS
- Creates platform-specific packages
- Uploads artifacts

#### 3. Build Docker Images
- Builds IDE and Server images
- Pushes to Docker Hub
- Tags: `latest`, version, SHA

#### 4. Create Release Package
- Combines all artifacts
- Generates checksums
- Creates release archive

**Example Run:**

```bash
# Manually trigger build
gh workflow run build.yml

# Download artifacts
gh run download <run-id>
```

### Deploy Workflow (`deploy.yml`)

**Triggers:**
- Tags matching `v*.*.*`
- Manual trigger with environment selection

**Jobs:**

#### 1. Deploy Server
- Uploads deployment package
- Backs up current version
- Deploys new version
- Runs health checks
- Automatic rollback on failure

#### 2. Deploy Docker
- Pulls latest images
- Backs up database
- Updates containers
- Zero-downtime deployment

#### 3. Create GitHub Release
- Generates changelog
- Creates GitHub release
- Attaches artifacts

#### 4. Update Documentation
- Updates version in docs
- Deploys documentation site

**Example Run:**

```bash
# Deploy to staging
gh workflow run deploy.yml -f environment=staging

# Deploy to production (via tag)
git tag v1.0.0
git push origin v1.0.0
```

## Secrets Configuration

### SSH Key Setup

```bash
# Generate key
ssh-keygen -t rsa -b 4096 -f ~/.ssh/miaoda-deploy -N ""

# Add to GitHub Secrets
cat ~/.ssh/miaoda-deploy | pbcopy  # macOS
cat ~/.ssh/miaoda-deploy | xclip   # Linux

# Add public key to server
cat ~/.ssh/miaoda-deploy.pub | ssh user@server 'cat >> ~/.ssh/authorized_keys'
```

### Docker Hub Token

```bash
# Create token at: https://hub.docker.com/settings/security
# Add to GitHub Secrets as DOCKER_PASSWORD
```

### Environment Variables

Create environment-specific secrets:

**Staging:**
- `STAGING_DEPLOY_HOST`
- `STAGING_DEPLOY_USER`

**Production:**
- `PRODUCTION_DEPLOY_HOST`
- `PRODUCTION_DEPLOY_USER`

## Deployment Process

### Automated Deployment (Recommended)

#### 1. Create Release Tag

```bash
# Update version in package.json
npm version patch  # or minor, major

# Push tag
git push origin --tags
```

#### 2. Monitor Deployment

```bash
# Watch workflow
gh run watch

# View logs
gh run view --log
```

#### 3. Verify Deployment

```bash
# Check health
curl https://your-domain.com/health

# Run health check script
bash scripts/deploy/health-check.sh
```

### Manual Deployment

#### 1. Build Locally

```bash
# Build all components
bash scripts/deploy/build-all.sh
```

#### 2. Deploy to Server

```bash
# Deploy cloud service
DEPLOY_HOST=your-server.com bash scripts/deploy/deploy-cloud.sh
```

#### 3. Verify Deployment

```bash
# SSH to server
ssh user@your-server.com

# Check service status
sudo systemctl status miaoda-server

# View logs
sudo journalctl -u miaoda-server -f
```

### Rollback Procedure

#### Automatic Rollback

The deploy workflow automatically rolls back on failure.

#### Manual Rollback

```bash
# SSH to server
ssh user@your-server.com

# Navigate to deployment directory
cd /opt/miaoda

# List backups
ls -lt backup-*

# Restore backup
rm -rf current
mv backup-YYYYMMDD-HHMMSS current

# Restart service
sudo systemctl restart miaoda-server

# Verify
curl http://localhost:3000/health
```

## Workflow Customization

### Modify Test Workflow

```yaml
# .github/workflows/test.yml

# Add custom test step
- name: Run custom tests
  run: yarn test:custom

# Add code coverage threshold
- name: Check coverage
  run: |
    yarn test:coverage
    npx nyc check-coverage --lines 80
```

### Add Deployment Environment

```yaml
# .github/workflows/deploy.yml

jobs:
  deploy-staging:
    name: Deploy to Staging
    environment:
      name: staging
      url: https://staging.miaoda.dev
    steps:
      # ... deployment steps
```

### Add Notifications

```yaml
# Add to any workflow

- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Monitoring CI/CD

### GitHub Actions Dashboard

```bash
# View all workflows
gh workflow list

# View workflow runs
gh run list

# View specific run
gh run view <run-id>

# Download artifacts
gh run download <run-id>
```

### Workflow Status Badge

Add to README.md:

```markdown
![Test](https://github.com/miaoda/miaoda-ide/workflows/Test/badge.svg)
![Build](https://github.com/miaoda/miaoda-ide/workflows/Build/badge.svg)
![Deploy](https://github.com/miaoda/miaoda-ide/workflows/Deploy/badge.svg)
```

## Troubleshooting

### Common Issues

#### 1. Test Failures

```bash
# Run tests locally
yarn test

# Run specific test
yarn test-node
yarn test-browser

# Check linting
yarn eslint
```

#### 2. Build Failures

```bash
# Clean and rebuild
rm -rf out/ node_modules/
yarn install
yarn compile

# Check disk space
df -h

# Clear Docker cache
docker system prune -a
```

#### 3. Deployment Failures

```bash
# Check SSH connection
ssh -i ~/.ssh/miaoda-deploy user@server.com

# Check server logs
ssh user@server.com 'sudo journalctl -u miaoda-server -n 100'

# Verify secrets
gh secret list
```

#### 4. Docker Push Failures

```bash
# Login to Docker Hub
docker login

# Test push manually
docker push miaoda/miaoda-ide:test

# Check token permissions
# Token needs: Read, Write, Delete
```

### Debug Workflow

Add debug step:

```yaml
- name: Debug
  run: |
    echo "GitHub ref: ${{ github.ref }}"
    echo "GitHub event: ${{ github.event_name }}"
    echo "Runner OS: ${{ runner.os }}"
    env
```

Enable debug logging:

```bash
# Set repository secret
ACTIONS_STEP_DEBUG=true
ACTIONS_RUNNER_DEBUG=true
```

## Best Practices

### 1. Branch Protection

- Require PR reviews
- Require status checks to pass
- Require branches to be up to date
- Restrict who can push

### 2. Semantic Versioning

```bash
# Patch release (bug fixes)
npm version patch

# Minor release (new features)
npm version minor

# Major release (breaking changes)
npm version major
```

### 3. Changelog

Maintain CHANGELOG.md:

```markdown
## [1.0.0] - 2024-01-01
### Added
- New feature X

### Changed
- Updated dependency Y

### Fixed
- Bug fix Z
```

### 4. Testing

- Write tests for new features
- Maintain >80% code coverage
- Run tests locally before pushing
- Use pre-commit hooks

### 5. Security

- Rotate secrets regularly
- Use environment-specific secrets
- Enable Dependabot
- Scan Docker images

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [Miaoda IDE Documentation](https://docs.miaoda.dev)
