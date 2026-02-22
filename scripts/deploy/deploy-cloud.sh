#!/bin/bash
# Deploy Cloud Service Script
# Deploys Miaoda server to production environment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "====================================="
echo "  Miaoda Cloud Service Deployment"
echo "====================================="
echo ""

# Configuration
DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_USER="${DEPLOY_USER:-miaoda}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/miaoda}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Validate configuration
if [ -z "$DEPLOY_HOST" ]; then
    print_error "DEPLOY_HOST environment variable is not set"
    echo "Usage: DEPLOY_HOST=example.com ./deploy-cloud.sh"
    exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
    print_error "SSH key not found: $SSH_KEY"
    exit 1
fi

print_status "Deployment Configuration:"
echo "  Host: $DEPLOY_HOST"
echo "  User: $DEPLOY_USER"
echo "  Path: $DEPLOY_PATH"
echo "  Environment: $ENVIRONMENT"
echo ""

# Confirm deployment
read -p "Continue with deployment? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    print_warning "Deployment cancelled"
    exit 0
fi

cd "$ROOT_DIR"

# Build the project
print_status "Building project..."
if [ ! -f "dist/server/miaoda-server.tar.gz" ]; then
    print_status "Running build script..."
    bash scripts/deploy/build-all.sh
fi

# Create deployment package
print_status "Creating deployment package..."
DEPLOY_PACKAGE="/tmp/miaoda-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
cp dist/server/miaoda-server.tar.gz "$DEPLOY_PACKAGE"

print_status "Deployment package: $DEPLOY_PACKAGE"

# Upload to server
print_status "Uploading to server..."
scp -i "$SSH_KEY" "$DEPLOY_PACKAGE" "$DEPLOY_USER@$DEPLOY_HOST:/tmp/"

# Deploy on server
print_status "Deploying on server..."
ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" << EOF
set -e

echo "Starting deployment on server..."

# Create deployment directory
sudo mkdir -p $DEPLOY_PATH
sudo chown $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH
cd $DEPLOY_PATH

# Backup current version
if [ -d "current" ]; then
    BACKUP_DIR="backup-\$(date +%Y%m%d-%H%M%S)"
    echo "Backing up current version to \$BACKUP_DIR"
    mv current \$BACKUP_DIR

    # Keep only last 5 backups
    ls -dt backup-* | tail -n +6 | xargs rm -rf
fi

# Extract new version
echo "Extracting new version..."
mkdir -p current
tar -xzf /tmp/$(basename $DEPLOY_PACKAGE) -C current/

# Create data directory
mkdir -p data

# Set permissions
chmod -R 755 current/

# Create or update systemd service
if [ ! -f "/etc/systemd/system/miaoda-server.service" ]; then
    echo "Creating systemd service..."
    sudo tee /etc/systemd/system/miaoda-server.service > /dev/null << 'SYSTEMD'
[Unit]
Description=Miaoda Server
After=network.target

[Service]
Type=simple
User=$DEPLOY_USER
WorkingDirectory=$DEPLOY_PATH/current
Environment="NODE_ENV=$ENVIRONMENT"
Environment="DATABASE_PATH=$DEPLOY_PATH/data/miaoda.db"
Environment="PORT=3000"
ExecStart=/usr/bin/node $DEPLOY_PATH/current/out/vs/server/node/server.main.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=miaoda-server

[Install]
WantedBy=multi-user.target
SYSTEMD
    sudo systemctl daemon-reload
    sudo systemctl enable miaoda-server
fi

# Restart service
echo "Restarting service..."
sudo systemctl restart miaoda-server

# Wait for service to start
echo "Waiting for service to start..."
sleep 10

# Check service status
if sudo systemctl is-active --quiet miaoda-server; then
    echo "Service is running"
else
    echo "ERROR: Service failed to start"
    sudo systemctl status miaoda-server
    exit 1
fi

# Health check
echo "Running health check..."
for i in {1..30}; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "Health check passed!"
        break
    fi
    if [ \$i -eq 30 ]; then
        echo "ERROR: Health check failed"
        exit 1
    fi
    echo "Waiting for service... (\$i/30)"
    sleep 2
done

# Cleanup
rm -f /tmp/$(basename $DEPLOY_PACKAGE)

echo "Deployment completed successfully!"
EOF

if [ $? -eq 0 ]; then
    print_status "Deployment successful!"

    # Run external health check
    print_status "Running external health check..."
    sleep 5
    if curl -f "https://$DEPLOY_HOST/health" > /dev/null 2>&1; then
        print_status "External health check passed!"
    else
        print_warning "External health check failed (this may be normal if SSL is not configured)"
    fi

    # Cleanup local package
    rm -f "$DEPLOY_PACKAGE"

    echo ""
    echo "====================================="
    echo "  Deployment Complete!"
    echo "====================================="
    echo ""
    print_status "Service URL: https://$DEPLOY_HOST"
    print_status "Health check: https://$DEPLOY_HOST/health"
    echo ""
else
    print_error "Deployment failed!"
    print_status "Attempting rollback..."

    ssh -i "$SSH_KEY" "$DEPLOY_USER@$DEPLOY_HOST" << 'EOF'
cd $DEPLOY_PATH
if [ -d "backup-*" ]; then
    LATEST_BACKUP=$(ls -dt backup-* | head -1)
    echo "Rolling back to $LATEST_BACKUP"
    rm -rf current
    mv $LATEST_BACKUP current
    sudo systemctl restart miaoda-server
    echo "Rollback completed"
fi
EOF

    exit 1
fi
