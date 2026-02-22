# Miaoda IDE - Troubleshooting Guide

Common issues and solutions for Miaoda IDE deployment and operation.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Runtime Issues](#runtime-issues)
3. [Docker Issues](#docker-issues)
4. [Performance Issues](#performance-issues)
5. [Database Issues](#database-issues)
6. [Network Issues](#network-issues)
7. [CI/CD Issues](#cicd-issues)
8. [Debugging Tools](#debugging-tools)

## Installation Issues

### Node.js Version Mismatch

**Problem:** Build fails with Node.js version error

**Solution:**
```bash
# Check Node.js version
node --version

# Install correct version (18.x)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or use nvm
nvm install 18
nvm use 18
```

### Yarn Install Fails

**Problem:** `yarn install` fails with network timeout

**Solution:**
```bash
# Increase network timeout
yarn install --network-timeout 180000

# Clear yarn cache
yarn cache clean

# Use different registry
yarn config set registry https://registry.npmmirror.com
```

### Build Dependencies Missing

**Problem:** Compilation fails with missing dependencies

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y build-essential pkg-config libxkbfile-dev libsecret-1-dev libkrb5-dev

# CentOS/RHEL
sudo yum groupinstall "Development Tools"
sudo yum install -y libxkbfile-devel libsecret-devel krb5-devel

# macOS
xcode-select --install
brew install pkg-config
```

### Python 2 Not Found (Windows)

**Problem:** Build fails with "Python 2 not found"

**Solution:**
```bash
# Install Python 2.7
choco install python2

# Or configure npm to use Python 3
npm config set python python3
```

## Runtime Issues

### Service Won't Start

**Problem:** Miaoda server fails to start

**Solution:**
```bash
# Check logs
sudo journalctl -u miaoda-server -n 50

# Check if port is in use
sudo netstat -tulpn | grep :3000

# Kill process using port
sudo kill -9 $(sudo lsof -t -i:3000)

# Restart service
sudo systemctl restart miaoda-server
```

### Database Lock Error

**Problem:** "database is locked" error

**Solution:**
```bash
# Check for processes using database
sudo lsof /opt/miaoda/data/miaoda.db

# Stop service
sudo systemctl stop miaoda-server

# Remove lock file if exists
rm -f /opt/miaoda/data/miaoda.db-wal
rm -f /opt/miaoda/data/miaoda.db-shm

# Start service
sudo systemctl start miaoda-server
```

### Permission Denied Errors

**Problem:** Permission errors when accessing files

**Solution:**
```bash
# Fix ownership
sudo chown -R miaoda:miaoda /opt/miaoda

# Fix permissions
sudo chmod -R 755 /opt/miaoda/current
sudo chmod -R 700 /opt/miaoda/data

# Check SELinux (if applicable)
sudo setenforce 0  # Temporary
sudo setsebool -P httpd_can_network_connect 1
```

### Out of Memory

**Problem:** Process killed due to OOM

**Solution:**
```bash
# Check memory usage
free -h

# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Add to systemd service
sudo systemctl edit miaoda-server
# Add:
[Service]
Environment="NODE_OPTIONS=--max-old-space-size=4096"

# Restart service
sudo systemctl daemon-reload
sudo systemctl restart miaoda-server
```

## Docker Issues

### Container Won't Start

**Problem:** Docker container exits immediately

**Solution:**
```bash
# Check logs
docker logs miaoda-server

# Check last exit code
docker inspect miaoda-server --format='{{.State.ExitCode}}'

# Run interactively for debugging
docker run -it --rm miaoda/miaoda-server:latest sh

# Check if port is already in use
sudo netstat -tulpn | grep :3000
```

### Volume Permission Issues

**Problem:** Permission denied in Docker volumes

**Solution:**
```bash
# Fix volume permissions
docker exec -u root miaoda-server chown -R node:node /data

# Or run container as specific user
docker run -d --user 1000:1000 miaoda/miaoda-server:latest

# Check volume ownership
docker exec miaoda-server ls -la /data
```

### Docker Build Fails

**Problem:** Docker build fails with errors

**Solution:**
```bash
# Clear build cache
docker builder prune -a

# Build with no cache
docker build --no-cache -f docker/Dockerfile.ide -t miaoda-ide .

# Check disk space
df -h
docker system df

# Clean up
docker system prune -a
```

### Container Health Check Failing

**Problem:** Container marked as unhealthy

**Solution:**
```bash
# Check health status
docker inspect --format='{{json .State.Health}}' miaoda-server | jq

# Test health endpoint manually
docker exec miaoda-server wget -O- http://localhost:3000/health

# Check container logs
docker logs miaoda-server --tail 100

# Restart container
docker restart miaoda-server
```

## Performance Issues

### Slow Response Times

**Problem:** Application responds slowly

**Solution:**
```bash
# Check system resources
top
htop

# Check disk I/O
iostat -x 1

# Check database performance
sqlite3 /opt/miaoda/data/miaoda.db "PRAGMA optimize;"
sqlite3 /opt/miaoda/data/miaoda.db "VACUUM;"

# Enable query logging
export DEBUG=*

# Check network latency
ping -c 10 your-server.com
```

### High CPU Usage

**Problem:** CPU usage constantly high

**Solution:**
```bash
# Identify process
top -o %CPU

# Check Node.js process
ps aux | grep node

# Profile application
node --prof out/vs/server/node/server.main.js

# Analyze profile
node --prof-process isolate-*.log > profile.txt

# Limit CPU usage (Docker)
docker update --cpus="2" miaoda-server
```

### High Memory Usage

**Problem:** Memory usage growing continuously

**Solution:**
```bash
# Check memory leaks
node --inspect out/vs/server/node/server.main.js

# Take heap snapshot
kill -USR2 $(pgrep -f "node.*server.main")

# Analyze with Chrome DevTools
# chrome://inspect

# Restart service periodically (workaround)
sudo systemctl restart miaoda-server
```

### Database Growing Large

**Problem:** Database file size increasing rapidly

**Solution:**
```bash
# Check database size
du -h /opt/miaoda/data/miaoda.db

# Vacuum database
sqlite3 /opt/miaoda/data/miaoda.db "VACUUM;"

# Analyze tables
sqlite3 /opt/miaoda/data/miaoda.db "SELECT name, SUM(pgsize) as size FROM dbstat GROUP BY name ORDER BY size DESC;"

# Clean old data
sqlite3 /opt/miaoda/data/miaoda.db "DELETE FROM logs WHERE created_at < datetime('now', '-30 days');"
```

## Database Issues

### Database Corruption

**Problem:** Database file corrupted

**Solution:**
```bash
# Check integrity
sqlite3 /opt/miaoda/data/miaoda.db "PRAGMA integrity_check;"

# Attempt repair
sqlite3 /opt/miaoda/data/miaoda.db ".recover" | sqlite3 recovered.db

# Restore from backup
bash scripts/backup/restore.sh

# If all else fails, recreate
mv /opt/miaoda/data/miaoda.db /opt/miaoda/data/miaoda.db.corrupt
sudo systemctl restart miaoda-server
```

### Migration Failures

**Problem:** Database migration fails

**Solution:**
```bash
# Backup database first
cp /opt/miaoda/data/miaoda.db /opt/miaoda/data/miaoda.db.backup

# Check migration status
sqlite3 /opt/miaoda/data/miaoda.db "SELECT * FROM migrations;"

# Manually run migration
sqlite3 /opt/miaoda/data/miaoda.db < migrations/001_initial.sql

# Rollback if needed
sqlite3 /opt/miaoda/data/miaoda.db < migrations/001_initial_down.sql
```

## Network Issues

### Cannot Connect to Server

**Problem:** Unable to access application

**Solution:**
```bash
# Check if service is running
sudo systemctl status miaoda-server

# Check if port is listening
sudo netstat -tulpn | grep :3000

# Test locally
curl http://localhost:3000/health

# Check firewall
sudo ufw status
sudo ufw allow 3000/tcp

# Check iptables
sudo iptables -L -n
```

### SSL Certificate Issues

**Problem:** SSL certificate errors

**Solution:**
```bash
# Check certificate validity
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout

# Test SSL connection
openssl s_client -connect your-domain.com:443

# Renew Let's Encrypt certificate
sudo certbot renew

# Check nginx configuration
sudo nginx -t
sudo systemctl reload nginx
```

### WebSocket Connection Fails

**Problem:** WebSocket connections not working

**Solution:**
```bash
# Check nginx configuration
# Ensure these headers are set:
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# Test WebSocket
wscat -c ws://localhost:8080

# Check for proxy timeout
proxy_read_timeout 86400;
proxy_send_timeout 86400;
```

### CORS Errors

**Problem:** CORS policy blocking requests

**Solution:**
```bash
# Add CORS headers to nginx
add_header 'Access-Control-Allow-Origin' '*';
add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range';

# Reload nginx
sudo systemctl reload nginx
```

## CI/CD Issues

### GitHub Actions Failing

**Problem:** Workflow fails to run

**Solution:**
```bash
# Check workflow syntax
gh workflow view test.yml

# View run logs
gh run view <run-id> --log

# Re-run failed jobs
gh run rerun <run-id>

# Check secrets
gh secret list
```

### Deployment Fails

**Problem:** Deployment workflow fails

**Solution:**
```bash
# Test SSH connection
ssh -i ~/.ssh/deploy_key user@server.com

# Check server logs
ssh user@server.com 'sudo journalctl -u miaoda-server -n 100'

# Verify secrets are set
gh secret list

# Manual deployment
DEPLOY_HOST=server.com bash scripts/deploy/deploy-cloud.sh
```

### Docker Push Fails

**Problem:** Cannot push to Docker Hub

**Solution:**
```bash
# Login to Docker Hub
docker login

# Check credentials
cat ~/.docker/config.json

# Test push manually
docker tag miaoda-ide miaoda/miaoda-ide:test
docker push miaoda/miaoda-ide:test

# Verify token permissions
# Token needs: Read, Write, Delete
```

## Debugging Tools

### Enable Debug Logging

```bash
# Node.js debug
export DEBUG=*
export NODE_DEBUG=*

# Application debug
export LOG_LEVEL=debug

# Restart service
sudo systemctl restart miaoda-server
```

### Monitor Logs in Real-time

```bash
# Systemd logs
sudo journalctl -u miaoda-server -f

# Docker logs
docker logs -f miaoda-server

# Application logs
tail -f /opt/miaoda/logs/application.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Performance Profiling

```bash
# CPU profiling
node --prof out/vs/server/node/server.main.js
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect out/vs/server/node/server.main.js
# Open chrome://inspect

# Heap snapshot
kill -USR2 $(pgrep -f "node.*server.main")
```

### Network Debugging

```bash
# Test connectivity
telnet localhost 3000
nc -zv localhost 3000

# Trace requests
curl -v http://localhost:3000/health

# Monitor network traffic
sudo tcpdump -i any port 3000

# Check DNS
nslookup your-domain.com
dig your-domain.com
```

### Database Debugging

```bash
# Open database
sqlite3 /opt/miaoda/data/miaoda.db

# Check tables
.tables

# Check schema
.schema

# Run query
SELECT * FROM users LIMIT 10;

# Check indexes
.indexes

# Analyze query plan
EXPLAIN QUERY PLAN SELECT * FROM users WHERE id = 1;
```

## Getting Help

If you can't resolve the issue:

1. **Check Documentation**: https://docs.miaoda.dev
2. **Search Issues**: https://github.com/miaoda/miaoda-ide/issues
3. **Create Issue**: Include:
   - Error messages
   - System information
   - Steps to reproduce
   - Logs
4. **Community Support**: Join our Discord/Slack

### Collecting Debug Information

```bash
# System information
uname -a
node --version
docker --version

# Service status
sudo systemctl status miaoda-server

# Recent logs
sudo journalctl -u miaoda-server -n 100 > logs.txt

# Resource usage
free -h
df -h
top -b -n 1 > top.txt

# Network status
ss -tulpn > network.txt

# Create archive
tar -czf debug-info.tar.gz logs.txt top.txt network.txt
```
