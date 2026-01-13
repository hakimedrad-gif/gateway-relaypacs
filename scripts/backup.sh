#!/bin/bash

#############################################################################
# RelayPACS Backup Script
#############################################################################
# This script creates backups of the RelayPACS database and configuration
#
# Usage:
#   ./scripts/backup.sh [backup_name]
#
# Examples:
#   ./scripts/backup.sh daily
#   ./scripts/backup.sh pre-deployment
#############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-backup}"
BACKUP_DIR="$PROJECT_ROOT/backups/${BACKUP_NAME}_${TIMESTAMP}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

#############################################################################
# Create Backup Directory
#############################################################################

create_backup_directory() {
    log_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
}

#############################################################################
# Backup PostgreSQL Database
#############################################################################

backup_postgres() {
    log_info "Backing up PostgreSQL database..."

    if ! docker ps | grep -q "geteway-postgres-1"; then
        log_warn "PostgreSQL container is not running, skipping database backup"
        return
    fi

    # Full database dump
    docker exec geteway-postgres-1 pg_dump -U relaypacs relaypacs > "$BACKUP_DIR/relaypacs_db.sql"

    # Compressed backup
    docker exec geteway-postgres-1 pg_dump -U relaypacs relaypacs | gzip > "$BACKUP_DIR/relaypacs_db.sql.gz"

    # Custom format (for selective restore)
    docker exec geteway-postgres-1 pg_dump -U relaypacs -Fc relaypacs > "$BACKUP_DIR/relaypacs_db.dump"

    log_info "✓ PostgreSQL backup completed"
    log_info "  SQL dump: $(du -h "$BACKUP_DIR/relaypacs_db.sql" | cut -f1)"
    log_info "  Compressed: $(du -h "$BACKUP_DIR/relaypacs_db.sql.gz" | cut -f1)"
}

#############################################################################
# Backup SQLite Database (if exists)
#############################################################################

backup_sqlite() {
    if [ -f "$PROJECT_ROOT/backend/relaypacs.db" ]; then
        log_info "Backing up SQLite database..."
        cp "$PROJECT_ROOT/backend/relaypacs.db" "$BACKUP_DIR/relaypacs.db"
        log_info "✓ SQLite backup completed"
    fi

    # Backup reports database
    if [ -f "$PROJECT_ROOT/backend/data/reports.db" ]; then
        log_info "Backing up reports database..."
        mkdir -p "$BACKUP_DIR/data"
        cp "$PROJECT_ROOT/backend/data/reports.db" "$BACKUP_DIR/data/reports.db"
        log_info "✓ Reports database backup completed"
    fi
}

#############################################################################
# Backup Configuration Files
#############################################################################

backup_config() {
    log_info "Backing up configuration files..."

    # Backup .env files
    if [ -f "$PROJECT_ROOT/backend/.env" ]; then
        cp "$PROJECT_ROOT/backend/.env" "$BACKUP_DIR/backend.env"
    fi

    if [ -f "$PROJECT_ROOT/frontend/.env" ]; then
        cp "$PROJECT_ROOT/frontend/.env" "$BACKUP_DIR/frontend.env"
    fi

    # Backup docker-compose.yml
    cp "$PROJECT_ROOT/docker-compose.yml" "$BACKUP_DIR/docker-compose.yml"

    # Backup Alembic migrations
    if [ -d "$PROJECT_ROOT/backend/alembic" ]; then
        cp -r "$PROJECT_ROOT/backend/alembic" "$BACKUP_DIR/alembic"
    fi

    log_info "✓ Configuration backup completed"
}

#############################################################################
# Backup Docker Volumes
#############################################################################

backup_volumes() {
    log_info "Backing up Docker volumes..."

    # Create volumes backup directory
    mkdir -p "$BACKUP_DIR/volumes"

    # Backup MinIO data (S3 storage)
    if docker volume ls | grep -q "geteway_minio_data"; then
        log_info "Backing up MinIO data..."
        docker run --rm \
            -v geteway_minio_data:/data \
            -v "$BACKUP_DIR/volumes":/backup \
            alpine tar czf /backup/minio_data.tar.gz -C /data .
        log_info "✓ MinIO backup completed: $(du -h "$BACKUP_DIR/volumes/minio_data.tar.gz" | cut -f1)"
    fi

    # Backup Orthanc data
    if docker volume ls | grep -q "geteway_orthanc_data"; then
        log_info "Backing up Orthanc data..."
        docker run --rm \
            -v geteway_orthanc_data:/data \
            -v "$BACKUP_DIR/volumes":/backup \
            alpine tar czf /backup/orthanc_data.tar.gz -C /data .
        log_info "✓ Orthanc backup completed: $(du -h "$BACKUP_DIR/volumes/orthanc_data.tar.gz" | cut -f1)"
    fi
}

#############################################################################
# Create Backup Manifest
#############################################################################

create_manifest() {
    log_info "Creating backup manifest..."

    cat > "$BACKUP_DIR/MANIFEST.txt" << EOF
RelayPACS Backup Manifest
=========================

Backup Name: $BACKUP_NAME
Timestamp: $TIMESTAMP
Date: $(date)
Hostname: $(hostname)

Contents:
---------
EOF

    # List all files with sizes
    find "$BACKUP_DIR" -type f -exec ls -lh {} \; | awk '{print $9, "(" $5 ")"}' >> "$BACKUP_DIR/MANIFEST.txt"

    # Add checksums
    echo -e "\nMD5 Checksums:" >> "$BACKUP_DIR/MANIFEST.txt"
    echo "-------------" >> "$BACKUP_DIR/MANIFEST.txt"
    find "$BACKUP_DIR" -type f -not -name "MANIFEST.txt" -exec md5sum {} \; >> "$BACKUP_DIR/MANIFEST.txt"

    log_info "✓ Manifest created"
}

#############################################################################
# Cleanup Old Backups
#############################################################################

cleanup_old_backups() {
    log_info "Cleaning up old backups (keeping last 7)..."

    # Count backups
    BACKUP_COUNT=$(find "$PROJECT_ROOT/backups" -maxdepth 1 -type d -name "${BACKUP_NAME}_*" | wc -l)

    if [ "$BACKUP_COUNT" -gt 7 ]; then
        # Remove oldest backups, keep newest 7
        find "$PROJECT_ROOT/backups" -maxdepth 1 -type d -name "${BACKUP_NAME}_*" | \
            sort | head -n -7 | xargs rm -rf
        log_info "✓ Cleaned up old backups"
    else
        log_info "✓ No cleanup needed (only $BACKUP_COUNT backups)"
    fi
}

#############################################################################
# Main Execution
#############################################################################

main() {
    log_info "======================================"
    log_info "RelayPACS Backup"
    log_info "Backup Name: $BACKUP_NAME"
    log_info "Timestamp: $TIMESTAMP"
    log_info "======================================"

    create_backup_directory
    backup_postgres
    backup_sqlite
    backup_config
    backup_volumes
    create_manifest
    cleanup_old_backups

    # Calculate total backup size
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

    log_info "======================================"
    log_info "✓ Backup completed successfully!"
    log_info "Location: $BACKUP_DIR"
    log_info "Total size: $TOTAL_SIZE"
    log_info "======================================"
}

# Run main function
main "$@"
