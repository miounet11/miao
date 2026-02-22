#!/bin/bash
# Database Backup Script
# Creates backups of the Miaoda database

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "====================================="
echo "  Miaoda Database Backup"
echo "====================================="
echo ""

# Configuration
DATA_DIR="${DATA_DIR:-/opt/miaoda/data}"
BACKUP_DIR="${BACKUP_DIR:-/opt/miaoda/backups}"
DB_FILE="${DB_FILE:-miaoda.db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
COMPRESS="${COMPRESS:-true}"

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

# Validate database exists
if [ ! -f "$DATA_DIR/$DB_FILE" ]; then
    print_error "Database file not found: $DATA_DIR/$DB_FILE"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="miaoda-db-backup-$TIMESTAMP"
BACKUP_FILE="$BACKUP_DIR/$BACKUP_NAME.db"

print_status "Starting database backup..."
print_status "Source: $DATA_DIR/$DB_FILE"
print_status "Destination: $BACKUP_FILE"

# Check if SQLite3 is available
if ! command -v sqlite3 &> /dev/null; then
    print_warning "sqlite3 not found, using file copy instead"
    cp "$DATA_DIR/$DB_FILE" "$BACKUP_FILE"
else
    # Use SQLite backup command for consistency
    print_status "Using SQLite backup command..."
    sqlite3 "$DATA_DIR/$DB_FILE" ".backup '$BACKUP_FILE'"
fi

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_status "Backup created successfully: $BACKUP_SIZE"
else
    print_error "Backup failed!"
    exit 1
fi

# Compress backup
if [ "$COMPRESS" = "true" ]; then
    print_status "Compressing backup..."
    gzip "$BACKUP_FILE"
    BACKUP_FILE="$BACKUP_FILE.gz"
    COMPRESSED_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_status "Compressed size: $COMPRESSED_SIZE"
fi

# Generate checksum
print_status "Generating checksum..."
if command -v sha256sum &> /dev/null; then
    sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
elif command -v shasum &> /dev/null; then
    shasum -a 256 "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
fi

# Cleanup old backups
print_status "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "miaoda-db-backup-*.db*" -type f -mtime +"$RETENTION_DAYS" -delete

OLD_CHECKSUMS=$(find "$BACKUP_DIR" -name "*.sha256" -type f -mtime +"$RETENTION_DAYS")
if [ -n "$OLD_CHECKSUMS" ]; then
    echo "$OLD_CHECKSUMS" | xargs rm -f
fi

# List recent backups
print_status "Recent backups:"
ls -lht "$BACKUP_DIR" | grep "miaoda-db-backup" | head -5

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
print_status "Total backup size: $TOTAL_SIZE"

echo ""
echo "====================================="
echo "  Backup Complete!"
echo "====================================="
echo ""
print_status "Backup file: $BACKUP_FILE"
print_status "Checksum: $BACKUP_FILE.sha256"
echo ""
