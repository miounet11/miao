# Miaoda IDE - Deployment Guide

Complete guide for deploying Miaoda IDE to production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Methods](#deployment-methods)
3. [Docker Deployment](#docker-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Configuration](#configuration)
6. [SSL/TLS Setup](#ssltls-setup)
7. [Monitoring](#monitoring)
8. [Backup and Restore](#backup-and-restore)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+)
- **CPU**: 2+ cores (4+ recommended)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Disk**: 20GB minimum (50GB+ recommended)
- **Node.js**: 18.x or higher
- **Docker**: 20.10+ (for Docker deployment)
- **Docker Compose**: 2.0+ (for Docker deployment)

### Network Requirements

- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 3000 (Backend API)
- Port 8080 (IDE Server)

## Deployment Methods

### 1. Docker Deployment (Recommended)

Best for production environments with easy scaling and management.

### 2. Manual Deployment

Best for custom setups or when Docker is not available.

## Docker Deployment

### Quick Start

```bash
# Clone repository
git clone https://github.com/miaoda/miaoda-ide.git
cd miaoda-ide

# Build all components
bash scripts/deploy/build-all.sh

# Setup SSL certificates
cd infrastructure
bash ssl-setup.sh

# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step-by-Step Docker Deployment

#### 1. Prepare the Environment

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
```

#### 2. Configure Environment Variables

Create `.env` file:

```bash
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_PATH=/data/miaoda.db

# Security
SESSION_SECRET=your-secret-key-here

# Logging
LOG_LEVEL=info

# Domain
DOMAIN=your-domain.com
EMAIL=admin@your-domain.com
```

#### 3. Setup SSL Certificates

```bash
cd infrastructure

# For Let's Encrypt (production)
export DOMAIN=your-domain.com
export EMAIL=admin@your-domain.com
bash ssl-setup.sh
# Choose option 2 for Let's Encrypt

# For self-signed (development)
bash ssl-setup.sh
# Choose option 1 for self-signed
```

#### 4. Deploy Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
sleep 30

# Check service status
docker-compose -f docker-compose.prod.yml ps

# Verify health
curl http://localhost:3000/health
```

#### 5. Configure Nginx

The nginx service is automatically configured. To customize:

```bash
# Edit nginx configuration
vim infrastructure/nginx.conf

# Reload nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

## Manual Deployment

### 1. Install Dependencies

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build dependencies
sudo apt-get install -y build-essential pkg-config libxkbfile-dev libsecret-1-dev libkrb5-dev

# Install Yarn
npm install -g yarn
```

### 2. Build Application

```bash
# Clone repository
git clone https://github.com/miaoda/miaoda-ide.git
cd miaoda-ide

# Install dependencies
yarn install --frozen-lockfile

# Build application
bash scripts/deploy/build-all.sh
```

### 3. Create System User

```bash
# Create miaoda user
sudo useradd -r -s /bin/bash -d /opt/miaoda miaoda

# Create directories
sudo mkdir -p /opt/miaoda/{current,data,backups,logs}
sudo chown -R miaoda:miaoda /opt/miaoda
```

### 4. Deploy Application

```bash
# Copy built files
sudo cp -r out extensions resources node_modules package.json product.json /opt/miaoda/current/

# Set permissions
sudo chown -R miaoda:miaoda /opt/miaoda/current
```

### 5. Create Systemd Service

```bash
sudo tee /etc/systemd/system/miaoda-server.service > /dev/null << 'EOF'
[Unit]
Description=Miaoda Server
After=network.target

[Service]
Type=simple
User=miaoda
WorkingDirectory=/opt/miaoda/current
Environment="NODE_ENV=production"
Environment="DATABASE_PATH=/opt/miaoda/data/miaoda.db"
Environment="PORT=3000"
ExecStart=/usr/bin/node /opt/miaoda/current/out/vs/server/node/server.main.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=miaoda-server

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable miaoda-server
sudo systemctl start miaoda-server

# Check status
sudo systemctl status miaoda-server
```

### 6. Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt-get install -y nginx

# Create configuration
sudo tee /etc/nginx/sites-available/miaoda << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/miaoda /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `NODE_ENV` | Environment (production/development) | `production` |
| `PORT` | Server port | `3000` |
| `DATABASE_PATH` | SQLite database path | `/data/miaoda.db` |
| `LOG_LEVEL` | Logging level (debug/info/warn/error) | `info` |
| `SESSION_SECRET` | Session encryption key | (required) |
| `MAX_CONNECTIONS` | Maximum concurrent connections | `100` |

### Product Configuration

Edit `product.json` to customize:

```json
{
  "nameShort": "Miaoda",
  "nameLong": "Miaoda IDE",
  "applicationName": "miaoda",
  "dataFolderName": ".miaoda"
}
```

## SSL/TLS Setup

### Let's Encrypt (Production)

```bash
# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### Self-Signed Certificate (Development)

```bash
# Generate certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/miaoda.key \
  -out /etc/ssl/certs/miaoda.crt
```

## Monitoring

### Access Monitoring Dashboards

- **Prometheus**: http://your-domain:9090
- **Grafana**: http://your-domain:3001 (default: admin/admin)

### Health Checks

```bash
# Run health check script
bash scripts/deploy/health-check.sh

# Manual health check
curl http://localhost:3000/health
```

### View Logs

```bash
# Docker logs
docker-compose -f docker-compose.prod.yml logs -f miaoda-server

# Systemd logs
sudo journalctl -u miaoda-server -f

# Application logs
tail -f /opt/miaoda/logs/application.log
```

## Backup and Restore

### Automated Backups

```bash
# Setup daily backup cron job
crontab -e

# Add these lines:
0 2 * * * /opt/miaoda/scripts/backup/backup-db.sh
0 3 * * * /opt/miaoda/scripts/backup/backup-configs.sh
```

### Manual Backup

```bash
# Backup database
bash scripts/backup/backup-db.sh

# Backup configurations
bash scripts/backup/backup-configs.sh
```

### Restore from Backup

```bash
# Interactive restore
bash scripts/backup/restore.sh
```

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

## Security Checklist

- [ ] SSL/TLS certificates installed and valid
- [ ] Firewall configured (UFW/iptables)
- [ ] Strong passwords and secrets
- [ ] Regular security updates
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Database access restricted
- [ ] Logs properly secured

## Performance Optimization

### Database Optimization

```bash
# Vacuum database
sqlite3 /opt/miaoda/data/miaoda.db "VACUUM;"

# Analyze database
sqlite3 /opt/miaoda/data/miaoda.db "ANALYZE;"
```

### Nginx Caching

Already configured in `infrastructure/nginx.conf`.

### Resource Limits

Edit `docker-compose.prod.yml` to adjust resource limits.

## Scaling

### Horizontal Scaling

For high-traffic deployments:

1. Use a load balancer (HAProxy, Nginx)
2. Deploy multiple IDE instances
3. Use shared database (PostgreSQL instead of SQLite)
4. Implement session storage (Redis)

### Vertical Scaling

Increase resources in `docker-compose.prod.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 8G
```

## Support

For issues and questions:
- GitHub Issues: https://github.com/miaoda/miaoda-ide/issues
- Documentation: https://docs.miaoda.dev
