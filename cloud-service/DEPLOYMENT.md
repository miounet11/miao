# Deployment Guide

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Docker (optional, for containerized deployment)

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your configuration:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=./data/miaoda.db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=7d
CORS_ORIGIN=*
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_WINDOW=15m
AUTH_RATE_LIMIT_MAX=5
LOG_LEVEL=info
CONFIG_CACHE_TTL=3600
```

**IMPORTANT:** Generate a strong JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Initialize Database

```bash
# Run migrations
npm run migrate

# Seed default data
npm run seed
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

---

## Production Deployment

### Option 1: Direct Node.js Deployment

#### 1. Prepare Environment

```bash
# Install production dependencies
npm ci --only=production

# Build TypeScript
npm run build
```

#### 2. Set Production Environment Variables

```bash
export NODE_ENV=production
export PORT=3000
export DATABASE_URL=/path/to/production/miaoda.db
export JWT_SECRET=your-production-secret
export CORS_ORIGIN=https://yourdomain.com
```

#### 3. Run Migrations

```bash
npm run migrate
npm run seed
```

#### 4. Start Server

```bash
npm start
```

#### 5. Process Manager (PM2)

For production, use PM2 to manage the process:

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/server.js --name miaoda-cloud-service

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

**PM2 Commands:**
```bash
pm2 status              # Check status
pm2 logs                # View logs
pm2 restart miaoda-cloud-service
pm2 stop miaoda-cloud-service
pm2 delete miaoda-cloud-service
```

---

### Option 2: Docker Deployment

#### 1. Build Docker Image

```bash
docker build -t miaoda-cloud-service .
```

#### 2. Run Container

```bash
docker run -d \
  -p 3000:3000 \
  -e JWT_SECRET=your-production-secret \
  -e NODE_ENV=production \
  -e CORS_ORIGIN=https://yourdomain.com \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --name miaoda-service \
  --restart unless-stopped \
  miaoda-cloud-service
```

#### 3. Using Docker Compose

Create `.env` file:
```env
JWT_SECRET=your-production-secret
```

Start services:
```bash
docker-compose up -d
```

**Docker Compose Commands:**
```bash
docker-compose ps              # Check status
docker-compose logs -f         # View logs
docker-compose restart         # Restart services
docker-compose down            # Stop services
```

---

### Option 3: Cloud Platform Deployment

#### AWS EC2

1. Launch EC2 instance (Ubuntu 22.04 LTS)
2. Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Clone repository and deploy:
```bash
git clone <your-repo>
cd cloud-service
npm ci --only=production
npm run build
npm run migrate
npm run seed
```

4. Setup systemd service:

Create `/etc/systemd/system/miaoda-cloud.service`:
```ini
[Unit]
Description=Miaoda Cloud Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/cloud-service
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=JWT_SECRET=your-secret
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable miaoda-cloud
sudo systemctl start miaoda-cloud
sudo systemctl status miaoda-cloud
```

#### Heroku

1. Create `Procfile`:
```
web: node dist/server.js
```

2. Deploy:
```bash
heroku create miaoda-cloud-service
heroku config:set JWT_SECRET=your-secret
heroku config:set NODE_ENV=production
git push heroku main
```

#### DigitalOcean App Platform

1. Connect GitHub repository
2. Set environment variables in dashboard
3. Deploy automatically on push

---

## Nginx Reverse Proxy

Setup Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable HTTPS with Let's Encrypt:
```bash
sudo certbot --nginx -d api.yourdomain.com
```

---

## Database Management

### Backup

```bash
# Backup SQLite database
cp data/miaoda.db data/miaoda.db.backup.$(date +%Y%m%d)

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
cp data/miaoda.db "$BACKUP_DIR/miaoda_$DATE.db"
# Keep only last 7 days
find $BACKUP_DIR -name "miaoda_*.db" -mtime +7 -delete
```

### Restore

```bash
cp data/miaoda.db.backup.20240101 data/miaoda.db
```

### Migration to PostgreSQL

For production scale, migrate to PostgreSQL:

1. Install PostgreSQL adapter:
```bash
npm install pg
```

2. Update database configuration
3. Export SQLite data and import to PostgreSQL

---

## Monitoring

### Health Checks

Setup monitoring to check `/api/v1/health`:

```bash
# Simple health check script
#!/bin/bash
HEALTH_URL="http://localhost:3000/api/v1/health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $STATUS -eq 200 ]; then
    echo "Service is healthy"
else
    echo "Service is down! Status: $STATUS"
    # Send alert
fi
```

### Log Management

Logs are written to:
- Console (development)
- `logs/error.log` (production errors)
- `logs/combined.log` (production all logs)

Setup log rotation:
```bash
# /etc/logrotate.d/miaoda-cloud
/path/to/cloud-service/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## Security Checklist

- [ ] Set strong `JWT_SECRET` (32+ characters)
- [ ] Configure proper `CORS_ORIGIN` (not `*` in production)
- [ ] Use HTTPS/TLS in production
- [ ] Set `NODE_ENV=production`
- [ ] Enable firewall (allow only 80, 443, 22)
- [ ] Regular database backups
- [ ] Keep dependencies updated
- [ ] Monitor logs for suspicious activity
- [ ] Use environment variables for secrets
- [ ] Implement rate limiting (already included)
- [ ] Regular security audits: `npm audit`

---

## Performance Optimization

### 1. Enable Compression
Already included via `compression` middleware.

### 2. Database Optimization
```sql
-- Analyze database
ANALYZE;

-- Vacuum database
VACUUM;
```

### 3. Caching
Model configs are cached for 1 hour (configurable via `CONFIG_CACHE_TTL`).

### 4. Load Balancing
For high traffic, use multiple instances behind a load balancer:

```bash
# Start multiple instances with PM2
pm2 start dist/server.js -i max --name miaoda-cloud-service
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000
# Kill process
kill -9 <PID>
```

### Database Locked
```bash
# Check for stale connections
fuser data/miaoda.db
# Restart application
```

### Memory Issues
```bash
# Check memory usage
pm2 monit
# Increase Node.js memory limit
node --max-old-space-size=4096 dist/server.js
```

### Permission Errors
```bash
# Fix file permissions
chmod -R 755 cloud-service
chown -R ubuntu:ubuntu cloud-service
```

---

## Scaling

### Horizontal Scaling

1. Use PostgreSQL instead of SQLite
2. Deploy multiple instances
3. Use Redis for session storage
4. Implement load balancer (Nginx, HAProxy)

### Vertical Scaling

1. Increase server resources (CPU, RAM)
2. Optimize database queries
3. Implement caching layer (Redis)
4. Use CDN for static assets

---

## Support

For issues and questions:
- Check logs: `pm2 logs` or `docker-compose logs`
- Review health endpoint: `/api/v1/health`
- Open GitHub issue
