#!/bin/bash
# Configuration Backup Script
# Backs up configuration files and settings

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "====================================="
echo "  Miaoda Configuration Backup"
echo "====================================="
echo ""

# Configuration
CONFIG_DIR="${CONFIG_DIR:-/opt/miaoda}"
BACKUP_DIR="${BACKUP_DIR:-/opt/miaoda/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="miaoda-config-backup-$TIMESTAMP"
BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.tar.gz"

print_status "Starting configuration backup..."
print_status "Source: $CONFIG_DIR"
print_status "Destination: $BACKUP_FILE"

# Create temporary directory for backup
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

mkdir -p "$TEMP_DIR/$BACKUP_NAME"

# Backup configuration files
print_status "Backing up configuration files..."

# Product configuration
if [ -f "$CONFIG_DIR/product.json" ]; then
    cp "$CONFIG_DIR/product.json" "$TEMP_DIR/$BACKUP_NAME/"
    print_status "✓ product.json"
fi

# Package configuration
if [ -f "$CONFIG_DIR/package.json" ]; then
    cp "$CONFIG_DIR/package.json" "$TEMP_DIR/$BACKUP_NAME/"
    print_status "✓ package.json"
fi

# Environment files
if [ -f "$CONFIG_DIR/.env" ]; then
    cp "$CONFIG_DIR/.env" "$TEMP_DIR/$BACKUP_NAME/"
    print_status "✓ .env"
fi

# Docker configurations
if [ -f "$CONFIG_DIR/docker-compose.yml" ]; then
    cp "$CONFIG_DIR/docker-compose.yml" "$TEMP_DIR/$BACKUP_NAME/"
    print_status "✓ docker-compose.yml"
fi

if [ -f "$CONFIG_DIR/docker-compose.prod.yml" ]; then
    cp "$CONFIG_DIR/docker-compose.prod.yml" "$TEMP_DIR/$BACKUP_NAME/"
    print_status "✓ docker-compose.prod.yml"
fi

# Nginx configuration
if [ -f "$CONFIG_DIR/nginx.conf" ]; then
    cp "$CONFIG_DIR/nginx.conf" "$TEMP_DIR/$BACKUP_NAME/"
    print_status "✓ nginx.conf"
fi

# SSL certificates (if any)
if [ -d "$CONFIG_DIR/ssl" ]; then
    cp -r "$CONFIG_DIR/ssl" "$TEMP_DIR/$BACKUP_NAME/"
    print_status "✓ ssl/"
fi

# Systemd service files
if [ -f "/etc/systemd/system/miaoda-server.service" ]; then
    sudo cp "/etc/systemd/system/miaoda-server.service" "$TEMP_DIR/$BACKUP_NAME/" 2>/dev/null || true
    print_status "✓ miaoda-server.service"
fi

# Create backup archive
print_status "Creating backup archive..."
cd "$TEMP_DIR"
tar -czf "$BACKUP_FILE" "$BACKUP_NAME/"
cd - > /dev/null

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_status "Backup created successfully: $BACKUP_SIZE"
else
    print_error "Backup failed!"
    exit 1
fi

# Generate checksum
print_status "Generating checksum..."
if command -v sha256sum &> /dev/null; then
    sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
elif command -v shasum &> /dev/null; then
    shasum -a 256 "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
fi

# Create backup manifest
print_status "Creating backup manifest..."
cat > "$BACKUP_FILE.manifest" << EOF
Backup Information
==================
Timestamp: $(date)
Hostname: $(hostname)
Backup File: $BACKUP_FILE
Size: $BACKUP_SIZE

Contents:
EOF

tar -tzf "$BACKUP_FILE" >> "$BACKUP_FILE.manifest"

# Cleanup old backups
print_status "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "miaoda-config-backup-*.tar.gz" -type f -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "*.sha256" -type f -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "*.manifest" -type f -mtime +"$RETENTION_DAYS" -delete

# List recent backups
print_status "Recent backups:"
ls -lht "$BACKUP_DIR" | grep "miaoda-config-backup" | head -5

echo ""
echo "====================================="
echo "  Backup Complete!"
echo "====================================="
echo ""
print_status "Backup file: $BACKUP_FILE"
print_status "Checksum: $BACKUP_FILE.sha256"
print_status "Manifest: $BACKUP_FILE.manifest"
echo ""
