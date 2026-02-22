#!/bin/bash
# Restore Script
# Restores database and configuration from backup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "====================================="
echo "  Miaoda Restore from Backup"
echo "====================================="
echo ""

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/miaoda/backups}"
DATA_DIR="${DATA_DIR:-/opt/miaoda/data}"
CONFIG_DIR="${CONFIG_DIR:-/opt/miaoda}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
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

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    print_error "Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# List available backups
print_status "Available backups:"
echo ""
echo "Database Backups:"
ls -lht "$BACKUP_DIR" | grep "miaoda-db-backup" | head -10 | nl
echo ""
echo "Configuration Backups:"
ls -lht "$BACKUP_DIR" | grep "miaoda-config-backup" | head -10 | nl
echo ""

# Restore type selection
echo "Select restore type:"
echo "1) Database only"
echo "2) Configuration only"
echo "3) Both database and configuration"
read -p "Enter choice [1-3]: " RESTORE_TYPE

case $RESTORE_TYPE in
    1)
        RESTORE_DB=true
        RESTORE_CONFIG=false
        ;;
    2)
        RESTORE_DB=false
        RESTORE_CONFIG=true
        ;;
    3)
        RESTORE_DB=true
        RESTORE_CONFIG=true
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

# Restore database
if [ "$RESTORE_DB" = true ]; then
    echo ""
    print_status "Database Restore"
    read -p "Enter database backup filename (or 'latest' for most recent): " DB_BACKUP

    if [ "$DB_BACKUP" = "latest" ]; then
        DB_BACKUP=$(ls -t "$BACKUP_DIR"/miaoda-db-backup-*.db* | head -1)
    else
        DB_BACKUP="$BACKUP_DIR/$DB_BACKUP"
    fi

    if [ ! -f "$DB_BACKUP" ]; then
        print_error "Backup file not found: $DB_BACKUP"
        exit 1
    fi

    print_status "Selected backup: $DB_BACKUP"

    # Verify checksum if available
    if [ -f "$DB_BACKUP.sha256" ]; then
        print_status "Verifying checksum..."
        if command -v sha256sum &> /dev/null; then
            sha256sum -c "$DB_BACKUP.sha256"
        elif command -v shasum &> /dev/null; then
            shasum -a 256 -c "$DB_BACKUP.sha256"
        fi
        print_status "Checksum verified!"
    fi

    # Confirm restore
    print_warning "This will overwrite the current database!"
    read -p "Continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        print_warning "Database restore cancelled"
    else
        # Stop service
        print_status "Stopping service..."
        sudo systemctl stop miaoda-server 2>/dev/null || true

        # Backup current database
        if [ -f "$DATA_DIR/miaoda.db" ]; then
            print_status "Backing up current database..."
            cp "$DATA_DIR/miaoda.db" "$DATA_DIR/miaoda.db.pre-restore-$(date +%Y%m%d-%H%M%S)"
        fi

        # Restore database
        print_status "Restoring database..."
        mkdir -p "$DATA_DIR"

        if [[ "$DB_BACKUP" == *.gz ]]; then
            gunzip -c "$DB_BACKUP" > "$DATA_DIR/miaoda.db"
        else
            cp "$DB_BACKUP" "$DATA_DIR/miaoda.db"
        fi

        print_status "Database restored successfully!"

        # Start service
        print_status "Starting service..."
        sudo systemctl start miaoda-server 2>/dev/null || true
    fi
fi

# Restore configuration
if [ "$RESTORE_CONFIG" = true ]; then
    echo ""
    print_status "Configuration Restore"
    read -p "Enter configuration backup filename (or 'latest' for most recent): " CONFIG_BACKUP

    if [ "$CONFIG_BACKUP" = "latest" ]; then
        CONFIG_BACKUP=$(ls -t "$BACKUP_DIR"/miaoda-config-backup-*.tar.gz | head -1)
    else
        CONFIG_BACKUP="$BACKUP_DIR/$CONFIG_BACKUP"
    fi

    if [ ! -f "$CONFIG_BACKUP" ]; then
        print_error "Backup file not found: $CONFIG_BACKUP"
        exit 1
    fi

    print_status "Selected backup: $CONFIG_BACKUP"

    # Show manifest if available
    if [ -f "$CONFIG_BACKUP.manifest" ]; then
        print_status "Backup manifest:"
        cat "$CONFIG_BACKUP.manifest"
        echo ""
    fi

    # Verify checksum if available
    if [ -f "$CONFIG_BACKUP.sha256" ]; then
        print_status "Verifying checksum..."
        if command -v sha256sum &> /dev/null; then
            sha256sum -c "$CONFIG_BACKUP.sha256"
        elif command -v shasum &> /dev/null; then
            shasum -a 256 -c "$CONFIG_BACKUP.sha256"
        fi
        print_status "Checksum verified!"
    fi

    # Confirm restore
    print_warning "This will overwrite current configuration files!"
    read -p "Continue? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        print_warning "Configuration restore cancelled"
    else
        # Extract to temporary directory
        TEMP_DIR=$(mktemp -d)
        trap "rm -rf $TEMP_DIR" EXIT

        print_status "Extracting backup..."
        tar -xzf "$CONFIG_BACKUP" -C "$TEMP_DIR"

        # Find the backup directory
        BACKUP_CONTENT=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -1)

        if [ -z "$BACKUP_CONTENT" ]; then
            print_error "Invalid backup archive"
            exit 1
        fi

        # Restore files
        print_status "Restoring configuration files..."
        cp -v "$BACKUP_CONTENT"/* "$CONFIG_DIR/" 2>/dev/null || true

        # Restore systemd service if present
        if [ -f "$BACKUP_CONTENT/miaoda-server.service" ]; then
            sudo cp "$BACKUP_CONTENT/miaoda-server.service" /etc/systemd/system/
            sudo systemctl daemon-reload
            print_status "✓ Systemd service restored"
        fi

        print_status "Configuration restored successfully!"

        # Restart service
        print_status "Restarting service..."
        sudo systemctl restart miaoda-server 2>/dev/null || true
    fi
fi

echo ""
echo "====================================="
echo "  Restore Complete!"
echo "====================================="
echo ""

# Run health check
if command -v curl &> /dev/null; then
    print_status "Running health check..."
    sleep 5
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        print_status "Service is healthy!"
    else
        print_warning "Health check failed. Please verify the service manually."
    fi
fi

print_status "Restore completed successfully!"
