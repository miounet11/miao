# Miaoda IDE - Deployment Documentation

Welcome to the Miaoda IDE deployment documentation. This directory contains comprehensive guides for deploying, monitoring, and maintaining Miaoda IDE in production environments.

## Documentation Index

### Getting Started

1. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Start here!
   - Complete deployment guide
   - Prerequisites and requirements
   - Step-by-step instructions
   - Docker and manual deployment
   - Configuration and SSL setup

### Specialized Guides

2. **[DOCKER_GUIDE.md](DOCKER_GUIDE.md)** - Docker deep dive
   - Docker image management
   - Container operations
   - Volume and network management
   - Docker Compose usage
   - Troubleshooting Docker issues

3. **[CI_CD_GUIDE.md](CI_CD_GUIDE.md)** - Continuous Integration/Deployment
   - GitHub Actions workflows
   - Secrets configuration
   - Automated testing
   - Deployment automation
   - Rollback procedures

4. **[MONITORING_GUIDE.md](MONITORING_GUIDE.md)** - Monitoring and observability
   - Prometheus setup
   - Grafana dashboards
   - Alert configuration
   - Log aggregation
   - Health checks

5. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Problem solving
   - Common issues and solutions
   - Installation problems
   - Runtime errors
   - Performance issues
   - Debugging tools

### Process Documentation

6. **[../../DEPLOYMENT_CHECKLIST.md](../../DEPLOYMENT_CHECKLIST.md)** - Pre-deployment checklist
   - Complete checklist for production deployment
   - Security verification
   - Testing requirements
   - Sign-off procedures

7. **[../../RELEASE_PROCESS.md](../../RELEASE_PROCESS.md)** - Release management
   - Version numbering
   - Release steps
   - Hotfix process
   - Rollback procedures

## Quick Links

### Deployment Methods

- **Docker (Recommended)**: See [DEPLOYMENT_GUIDE.md#docker-deployment](DEPLOYMENT_GUIDE.md#docker-deployment)
- **Manual Deployment**: See [DEPLOYMENT_GUIDE.md#manual-deployment](DEPLOYMENT_GUIDE.md#manual-deployment)
- **CI/CD Pipeline**: See [CI_CD_GUIDE.md](CI_CD_GUIDE.md)

### Common Tasks

- **Initial Setup**: [DEPLOYMENT_GUIDE.md#quick-start](DEPLOYMENT_GUIDE.md#quick-start)
- **SSL Configuration**: [DEPLOYMENT_GUIDE.md#ssltls-setup](DEPLOYMENT_GUIDE.md#ssltls-setup)
- **Backup & Restore**: [DEPLOYMENT_GUIDE.md#backup-and-restore](DEPLOYMENT_GUIDE.md#backup-and-restore)
- **Health Checks**: [MONITORING_GUIDE.md#health-checks](MONITORING_GUIDE.md#health-checks)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## Quick Start

### 1. Docker Deployment (5 minutes)

```bash
# Clone and build
git clone https://github.com/miaoda/miaoda-ide.git
cd miaoda-ide
bash scripts/deploy/build-all.sh

# Setup SSL
cd infrastructure
export DOMAIN=your-domain.com
export EMAIL=admin@your-domain.com
bash ssl-setup.sh

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Verify
bash ../scripts/deploy/health-check.sh
```

### 2. Manual Deployment

```bash
# Build
bash scripts/deploy/build-all.sh

# Deploy
DEPLOY_HOST=your-server.com bash scripts/deploy/deploy-cloud.sh

# Verify
HOST=your-server.com bash scripts/deploy/health-check.sh
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Internet                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │  Nginx (443)   │  SSL/TLS, Reverse Proxy
            └────────┬───────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│  Miaoda IDE     │    │  Miaoda Server   │
│  (Port 8080)    │    │  (Port 3000)     │
│  - Web IDE      │    │  - REST API      │
│  - Extensions   │    │  - WebSocket     │
└─────────────────┘    └────────┬─────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  SQLite DB      │
                       │  /data/miaoda.db│
                       └─────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Monitoring Stack                            │
├─────────────────────────────────────────────────────────┤
│  Prometheus (9090) → Grafana (3001)                     │
│  - Metrics Collection                                    │
│  - Alerting                                              │
│  - Dashboards                                            │
└─────────────────────────────────────────────────────────┘
```

## System Requirements

### Minimum
- **CPU**: 2 cores
- **RAM**: 4GB
- **Disk**: 20GB
- **OS**: Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+)

### Recommended
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Disk**: 50GB+ SSD
- **OS**: Ubuntu 22.04 LTS

### Software
- Node.js 18.x
- Docker 20.10+ (for Docker deployment)
- Docker Compose 2.0+
- Nginx (for manual deployment)

## Security Checklist

- [ ] SSL/TLS certificates installed
- [ ] Firewall configured
- [ ] Strong passwords/secrets
- [ ] Regular security updates
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Rate limiting enabled
- [ ] Security headers configured

## Support

### Documentation
- **Deployment Guides**: This directory
- **API Documentation**: https://docs.miaoda.dev/api
- **User Guide**: https://docs.miaoda.dev/guide

### Community
- **GitHub Issues**: https://github.com/miaoda/miaoda-ide/issues
- **Discussions**: https://github.com/miaoda/miaoda-ide/discussions
- **Discord**: https://discord.gg/miaoda

### Commercial Support
- **Email**: support@miaoda.dev
- **Enterprise**: enterprise@miaoda.dev

## Contributing

Found an issue with the documentation? Please:

1. Check existing issues
2. Create a new issue with details
3. Submit a pull request with improvements

## License

MIT License - See [LICENSE.txt](../../LICENSE.txt)

---

**Need help?** Start with [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) or check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
