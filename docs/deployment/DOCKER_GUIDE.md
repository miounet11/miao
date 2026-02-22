# Miaoda IDE - Docker Guide

Comprehensive guide for using Docker with Miaoda IDE.

## Table of Contents

1. [Docker Images](#docker-images)
2. [Quick Start](#quick-start)
3. [Development Environment](#development-environment)
4. [Production Environment](#production-environment)
5. [Docker Compose](#docker-compose)
6. [Building Images](#building-images)
7. [Configuration](#configuration)
8. [Volumes and Data](#volumes-and-data)
9. [Networking](#networking)
10. [Troubleshooting](#troubleshooting)

## Docker Images

Miaoda IDE provides three Docker images:

### 1. IDE Image (`Dockerfile.ide`)
- Full IDE build with all extensions
- Web-based code editor
- Port: 8080

### 2. Server Image (`Dockerfile.server`)
- Backend API service
- Database management
- Port: 3000

### 3. Development Image (`Dockerfile.dev`)
- Hot-reload enabled
- Development tools included
- Debugging support

## Quick Start

### Pull Pre-built Images

```bash
# Pull latest images
docker pull miaoda/miaoda-ide:latest
docker pull miaoda/miaoda-server:latest
```

### Run Single Container

```bash
# Run IDE
docker run -d \
  --name miaoda-ide \
  -p 8080:8080 \
  -v miaoda-data:/data \
  miaoda/miaoda-ide:latest

# Run Server
docker run -d \
  --name miaoda-server \
  -p 3000:3000 \
  -v miaoda-data:/data \
  -e NODE_ENV=production \
  miaoda/miaoda-server:latest
```

### Access Application

- IDE: http://localhost:8080
- API: http://localhost:3000
- Health: http://localhost:3000/health

## Development Environment

### Start Development Environment

```bash
# Using Docker Compose
cd infrastructure
docker-compose up -d

# View logs
docker-compose logs -f

# Stop environment
docker-compose down
```

### Development with Hot Reload

```bash
# Build development image
docker build -f docker/Dockerfile.dev -t miaoda-dev .

# Run with volume mount for hot reload
docker run -d \
  --name miaoda-dev \
  -p 8080:8080 \
  -p 9229:9229 \
  -v $(pwd):/workspace \
  -v /workspace/node_modules \
  miaoda-dev

# Attach to logs
docker logs -f miaoda-dev
```

### Debug in Container

```bash
# Run with debugging enabled
docker run -d \
  --name miaoda-debug \
  -p 8080:8080 \
  -p 9229:9229 \
  -e NODE_OPTIONS="--inspect=0.0.0.0:9229" \
  miaoda/miaoda-ide:latest

# Connect debugger to localhost:9229
```

## Production Environment

### Deploy Production Stack

```bash
# Navigate to infrastructure directory
cd infrastructure

# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Production Configuration

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

# Resources
MAX_CONNECTIONS=100
```

### Update Production Deployment

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Recreate containers with new images
docker-compose -f docker-compose.prod.yml up -d --no-deps --build

# Remove old images
docker image prune -f
```

## Docker Compose

### Basic Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose stop

# Restart services
docker-compose restart

# Remove services
docker-compose down

# Remove services and volumes
docker-compose down -v

# View logs
docker-compose logs -f [service-name]

# Execute command in container
docker-compose exec miaoda-server sh

# Scale services
docker-compose up -d --scale miaoda-ide=3
```

### Service Management

```bash
# Start specific service
docker-compose up -d miaoda-server

# Restart specific service
docker-compose restart miaoda-server

# View service logs
docker-compose logs -f miaoda-server

# Check service health
docker-compose ps
```

## Building Images

### Build All Images

```bash
# Build IDE image
docker build -f docker/Dockerfile.ide -t miaoda/miaoda-ide:latest .

# Build Server image
docker build -f docker/Dockerfile.server -t miaoda/miaoda-server:latest .

# Build Development image
docker build -f docker/Dockerfile.dev -t miaoda/miaoda-dev:latest .
```

### Build with BuildKit

```bash
# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1

# Build with cache
docker build \
  --cache-from miaoda/miaoda-ide:latest \
  -f docker/Dockerfile.ide \
  -t miaoda/miaoda-ide:latest \
  .
```

### Multi-platform Builds

```bash
# Setup buildx
docker buildx create --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f docker/Dockerfile.ide \
  -t miaoda/miaoda-ide:latest \
  --push \
  .
```

### Build Arguments

```bash
# Build with custom Node version
docker build \
  --build-arg NODE_VERSION=18 \
  -f docker/Dockerfile.ide \
  -t miaoda/miaoda-ide:latest \
  .
```

## Configuration

### Environment Variables

```bash
# Pass environment variables
docker run -d \
  -e NODE_ENV=production \
  -e DATABASE_PATH=/data/miaoda.db \
  -e LOG_LEVEL=debug \
  miaoda/miaoda-server:latest

# Use env file
docker run -d \
  --env-file .env \
  miaoda/miaoda-server:latest
```

### Resource Limits

```bash
# Set CPU and memory limits
docker run -d \
  --cpus="2" \
  --memory="2g" \
  --memory-swap="2g" \
  miaoda/miaoda-ide:latest
```

### Health Checks

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' miaoda-server

# View health check logs
docker inspect --format='{{json .State.Health}}' miaoda-server | jq
```

## Volumes and Data

### Named Volumes

```bash
# Create volume
docker volume create miaoda-data

# List volumes
docker volume ls

# Inspect volume
docker volume inspect miaoda-data

# Remove volume
docker volume rm miaoda-data
```

### Bind Mounts

```bash
# Mount host directory
docker run -d \
  -v /host/path/data:/data \
  -v /host/path/logs:/app/logs \
  miaoda/miaoda-server:latest
```

### Backup Volumes

```bash
# Backup volume to tar
docker run --rm \
  -v miaoda-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/miaoda-data-backup.tar.gz -C /data .

# Restore volume from tar
docker run --rm \
  -v miaoda-data:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/miaoda-data-backup.tar.gz"
```

### Copy Files

```bash
# Copy from container to host
docker cp miaoda-server:/data/miaoda.db ./backup/

# Copy from host to container
docker cp ./config.json miaoda-server:/app/config.json
```

## Networking

### Network Commands

```bash
# Create network
docker network create miaoda-network

# List networks
docker network ls

# Inspect network
docker network inspect miaoda-network

# Connect container to network
docker network connect miaoda-network miaoda-server

# Disconnect container from network
docker network disconnect miaoda-network miaoda-server
```

### Custom Network

```bash
# Run containers on custom network
docker run -d \
  --name miaoda-server \
  --network miaoda-network \
  miaoda/miaoda-server:latest

docker run -d \
  --name miaoda-ide \
  --network miaoda-network \
  miaoda/miaoda-ide:latest
```

### Port Mapping

```bash
# Map multiple ports
docker run -d \
  -p 8080:8080 \
  -p 9229:9229 \
  miaoda/miaoda-ide:latest

# Map to specific host IP
docker run -d \
  -p 127.0.0.1:8080:8080 \
  miaoda/miaoda-ide:latest

# Random port mapping
docker run -d -P miaoda/miaoda-ide:latest
```

## Troubleshooting

### Container Logs

```bash
# View logs
docker logs miaoda-server

# Follow logs
docker logs -f miaoda-server

# Last 100 lines
docker logs --tail 100 miaoda-server

# Logs with timestamps
docker logs -t miaoda-server
```

### Container Shell Access

```bash
# Execute shell in running container
docker exec -it miaoda-server sh

# Execute as root
docker exec -it -u root miaoda-server sh

# Run command
docker exec miaoda-server node --version
```

### Container Inspection

```bash
# Inspect container
docker inspect miaoda-server

# Get specific information
docker inspect --format='{{.State.Status}}' miaoda-server
docker inspect --format='{{.NetworkSettings.IPAddress}}' miaoda-server
```

### Resource Usage

```bash
# View container stats
docker stats miaoda-server

# View all containers stats
docker stats

# One-time stats
docker stats --no-stream
```

### Common Issues

#### Container Won't Start

```bash
# Check logs
docker logs miaoda-server

# Check if port is already in use
sudo netstat -tulpn | grep :3000

# Remove and recreate
docker rm -f miaoda-server
docker-compose up -d miaoda-server
```

#### Permission Issues

```bash
# Fix volume permissions
docker exec -u root miaoda-server chown -R node:node /data

# Run as specific user
docker run -d --user 1000:1000 miaoda/miaoda-server:latest
```

#### Network Issues

```bash
# Test connectivity
docker exec miaoda-server ping -c 3 miaoda-ide

# Check DNS
docker exec miaoda-server nslookup miaoda-ide

# Recreate network
docker network rm miaoda-network
docker network create miaoda-network
```

#### Out of Disk Space

```bash
# Clean up unused resources
docker system prune -a

# Remove unused volumes
docker volume prune

# Remove unused images
docker image prune -a

# Check disk usage
docker system df
```

## Best Practices

### Security

1. **Don't run as root**: Use non-root user in containers
2. **Scan images**: Use `docker scan` to check for vulnerabilities
3. **Use secrets**: Don't hardcode sensitive data
4. **Limit resources**: Set CPU and memory limits
5. **Update regularly**: Keep base images updated

### Performance

1. **Use multi-stage builds**: Reduce image size
2. **Leverage build cache**: Order Dockerfile commands properly
3. **Use .dockerignore**: Exclude unnecessary files
4. **Minimize layers**: Combine RUN commands
5. **Use volumes**: For persistent data

### Maintenance

```bash
# Regular cleanup
docker system prune -a --volumes

# Update images
docker-compose pull
docker-compose up -d

# Backup data
docker-compose exec miaoda-server sh -c 'sqlite3 /data/miaoda.db ".backup /data/backup.db"'
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Miaoda IDE Documentation](https://docs.miaoda.dev)
