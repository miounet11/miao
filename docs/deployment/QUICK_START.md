# Miaoda IDE - Quick Start Guide

**Get Miaoda IDE running in production in under 10 minutes!**

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- 4GB RAM, 2 CPU cores, 20GB disk
- Domain name pointed to your server
- SSH access

## Option 1: Docker Deployment (Recommended)

### Step 1: Install Docker (2 minutes)

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Clone and Build (3 minutes)

```bash
# Clone repository
git clone https://github.com/miaoda/miaoda-ide.git
cd miaoda-ide

# Build all components
bash scripts/deploy/build-all.sh
```

### Step 3: Setup SSL (2 minutes)

```bash
cd infrastructure

# Set your domain and email
export DOMAIN=your-domain.com
export EMAIL=admin@your-domain.com

# Run SSL setup
bash ssl-setup.sh
# Choose option 2 for Let's Encrypt (production)
# Or option 1 for self-signed (development)
```

### Step 4: Deploy (2 minutes)

```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
sleep 30

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### Step 5: Verify (1 minute)

```bash
# Run health check
bash ../scripts/deploy/health-check.sh

# Or manually check
curl http://localhost:3000/health

# Access your IDE
open https://your-domain.com
```

**Done! Your Miaoda IDE is now running!** 🎉

---

## Option 2: Manual Deployment

### Step 1: Install Dependencies (3 minutes)

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build dependencies
sudo apt-get install -y build-essential pkg-config libxkbfile-dev libsecret-1-dev libkrb5-dev

# Install Yarn
npm install -g yarn
```

### Step 2: Build Application (5 minutes)

```bash
# Clone repository
git clone https://github.com/miaoda/miaoda-ide.git
cd miaoda-ide

# Install dependencies
yarn install --frozen-lockfile

# Build
bash scripts/deploy/build-all.sh
```

### Step 3: Deploy to Server (2 minutes)

```bash
# Set deployment variables
export DEPLOY_HOST=your-server.com
export DEPLOY_USER=miaoda

# Deploy
bash scripts/deploy/deploy-cloud.sh
```

**Done! Your Miaoda IDE is deployed!** 🎉

---

## Post-Deployment

### Setup Monitoring

```bash
# Access Grafana
open http://your-domain:3001
# Login: admin/admin (change password!)

# Access Prometheus
open http://your-domain:9090
```

### Configure Backups

```bash
# Add to crontab
crontab -e

# Add these lines:
0 2 * * * /opt/miaoda/scripts/backup/backup-db.sh
0 3 * * * /opt/miaoda/scripts/backup/backup-configs.sh
```

### Setup CI/CD (Optional)

```bash
# Add GitHub secrets
gh secret set SSH_PRIVATE_KEY < ~/.ssh/deploy_key
gh secret set DEPLOY_HOST -b "your-server.com"
gh secret set DEPLOY_USER -b "miaoda"
gh secret set DOCKER_USERNAME -b "your-username"
gh secret set DOCKER_PASSWORD -b "your-token"

# Deploy via tag
git tag v1.0.0
git push origin v1.0.0
```

---

## Troubleshooting

### Service won't start?

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Or for manual deployment
sudo journalctl -u miaoda-server -f
```

### Can't access the IDE?

```bash
# Check firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check if service is running
curl http://localhost:3000/health
```

### SSL certificate issues?

```bash
# Check certificate
openssl x509 -in infrastructure/ssl/cert.pem -text -noout

# Renew Let's Encrypt
sudo certbot renew
```

### Need more help?

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions.

---

## Next Steps

1. **Secure your installation**
   - Change default passwords
   - Configure firewall
   - Enable 2FA

2. **Customize configuration**
   - Edit `product.json`
   - Configure extensions
   - Set resource limits

3. **Setup monitoring**
   - Configure alerts
   - Create dashboards
   - Setup notifications

4. **Read the docs**
   - [Deployment Guide](DEPLOYMENT_GUIDE.md)
   - [Docker Guide](DOCKER_GUIDE.md)
   - [Monitoring Guide](MONITORING_GUIDE.md)

---

## Quick Reference

### Useful Commands

```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.prod.yml stop

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart service
docker-compose -f docker-compose.prod.yml restart miaoda-server

# Health check
bash scripts/deploy/health-check.sh

# Backup database
bash scripts/backup/backup-db.sh

# Restore from backup
bash scripts/backup/restore.sh
```

### Important URLs

- **IDE**: https://your-domain.com
- **API**: https://your-domain.com/api
- **Health**: https://your-domain.com/health
- **Grafana**: http://your-domain:3001
- **Prometheus**: http://your-domain:9090

### Important Files

- **Configuration**: `product.json`
- **Environment**: `.env`
- **Docker Compose**: `infrastructure/docker-compose.prod.yml`
- **Nginx**: `infrastructure/nginx.conf`
- **Database**: `/opt/miaoda/data/miaoda.db`

---

**Congratulations! You're now running Miaoda IDE in production!** 🚀

For detailed documentation, see the [Deployment Guide](DEPLOYMENT_GUIDE.md).
