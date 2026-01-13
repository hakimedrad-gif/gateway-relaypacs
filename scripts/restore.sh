#!/bin/bash

#############################################################################
# RelayPACS Restore Script
#############################################################################
# This script restores RelayPACS from a backup
#
# Usage:
#   ./scripts/restore.sh <backup_directory>
#
# Examples:
#   ./scripts/restore.sh backups/daily_20260113_050000
#   ./scripts/restore.sh backups/pre-deployment_20260112_180000
#############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${1:-}"

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
# Validate Backup
#############################################################################

validate_backup() {
    log_info "Validating backup directory..."
    
    if [ -z "$BACKUP_DIR" ]; then
        log_error "Usage: $0 <backup_directory>"
        log_error "Example: $0 backups/daily_20260113_050000"
        exit 1
    fi
    
    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
    
    # Check for manifest
    if [ ! -f "$BACKUP_DIR/MANIFEST.txt" ]; then
        log_warn "Backup manifest not found, proceeding with caution..."
    else
        log_info "Found backup manifest:"
        head -n 10 "$BACKUP_DIR/MANIFEST.txt"
    fi
    
    log_info "✓ Backup validation completed"
}

#############################################################################
# Confirm Restore
#############################################################################

confirm_restore() {
    log_warn "======================================"
    log_warn "WARNING: This will replace current data!"
    log_warn "Backup: $BACKUP_DIR"
    log_warn "======================================"
    
    read -p "Do you want to continue? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        log_info "Restore cancelled by user"
        exit 0
    fi
}

#############################################################################
# Stop Services
#############################################################################

stop_services() {
    log_info "Stopping services..."
    
    cd "$PROJECT_ROOT"
    docker-compose down
    
    log_info "✓ Services stopped"
}

#############################################################################
# Restore PostgreSQL Database
#############################################################################

restore_postgres() {
    log_info "Restoring PostgreSQL database..."
    
    # Start PostgreSQL only
    docker-compose up -d postgres
    sleep 5
    
    # Choose restore format
    if [ -f "$BACKUP_DIR/relaypacs_db.sql" ]; then
        log_info "Restoring from SQL dump..."
        
        # Drop and recreate database
        docker exec geteway-postgres-1 psql -U relaypacs -c "DROP DATABASE IF EXISTS relaypacs;"
        docker exec geteway-postgres-1 psql -U relaypacs -c "CREATE DATABASE relaypacs;"
        
        # Restore from SQL
        docker exec -i geteway-postgres-1 psql -U relaypacs relaypacs < "$BACKUP_DIR/relaypacs_db.sql"
        
        log_info "✓ PostgreSQL restored from SQL dump"
    
    elif [ -f "$BACKUP_DIR/relaypacs_db.dump" ]; then
        log_info "Restoring from custom format dump..."
        
        # Copy dump file to container
        docker cp "$BACKUP_DIR/relaypacs_db.dump" geteway-postgres-1:/tmp/restore.dump
        
        # Restore using pg_restore
        docker exec geteway-postgres-1 pg_restore -U relaypacs -d relaypacs --clean --if-exists /tmp/restore.dump
        
        # Cleanup
        docker exec geteway-postgres-1 rm /tmp/restore.dump
        
        log_info "✓ PostgreSQL restored from custom dump"
    
    elif [ -f "$BACKUP_DIR/relaypacs_db.sql.gz" ]; then
        log_info "Restoring from compressed dump..."
        
        # Restore from compressed file
        gunzip -c "$BACKUP_DIR/relaypacs_db.sql.gz" | docker exec -i geteway-postgres-1 psql -U relaypacs relaypacs
        
        log_info "✓ PostgreSQL restored from compressed dump"
    
    else
        log_warn "No PostgreSQL backup found, skipping database restore"
    fi
}

#############################################################################
# Restore SQLite Database
#############################################################################

restore_sqlite() {
    if [ -f "$BACKUP_DIR/relaypacs.db" ]; then
        log_info "Restoring SQLite database..."
        cp "$BACKUP_DIR/relaypacs.db" "$PROJECT_ROOT/backend/relaypacs.db"
        log_info "✓ SQLite database restored"
    fi
    
    if [ -f "$BACKUP_DIR/data/reports.db" ]; then
        log_info "Restoring reports database..."
        mkdir -p "$PROJECT_ROOT/backend/data"
        cp "$BACKUP_DIR/data/reports.db" "$PROJECT_ROOT/backend/data/reports.db"
        log_info "✓ Reports database restored"
    fi
}

#############################################################################
# Restore Configuration Files
#############################################################################

restore_config() {
    log_info "Restoring configuration files..."
    
    # Restore .env files
    if [ -f "$BACKUP_DIR/backend.env" ]; then
        cp "$BACKUP_DIR/backend.env" "$PROJECT_ROOT/backend/.env"
        log_info "✓ Backend .env restored"
    fi
    
    if [ -f "$BACKUP_DIR/frontend.env" ]; then
        cp "$BACKUP_DIR/frontend.env" "$PROJECT_ROOT/frontend/.env"
        log_info "✓ Frontend .env restored"
    fi
    
    # Note: We don't restore docker-compose.yml automatically as it may have changed
    if [ -f "$BACKUP_DIR/docker-compose.yml" ]; then
        log_warn "docker-compose.yml backup found but not automatically restored"
        log_warn "Review backup: $BACKUP_DIR/docker-compose.yml"
    fi
}

#############################################################################
# Restore Docker Volumes
#############################################################################

restore_volumes() {
    log_info "Restoring Docker volumes..."
    
    # Restore MinIO data
    if [ -f "$BACKUP_DIR/volumes/minio_data.tar.gz" ]; then
        log_info "Restoring MinIO data..."
        
        # Remove existing volume and recreate
        docker volume rm geteway_minio_data 2>/dev/null || true
        docker volume create geteway_minio_data
        
        # Restore from backup
        docker run --rm \
            -v geteway_minio_data:/data \
            -v "$BACKUP_DIR/volumes":/backup \
            alpine tar xzf /backup/minio_data.tar.gz -C /data
        
        log_info "✓ MinIO data restored"
    fi
    
    # Restore Orthanc data
    if [ -f "$BACKUP_DIR/volumes/orthanc_data.tar.gz" ]; then
        log_info "Restoring Orthanc data..."
        
        # Remove existing volume and recreate
        docker volume rm geteway_orthanc_data 2>/dev/null || true
        docker volume create geteway_orthanc_data
        
        # Restore from backup
        docker run --rm \
            -v geteway_orthanc_data:/data \
            -v "$BACKUP_DIR/volumes":/backup \
            alpine tar xzf /backup/orthanc_data.tar.gz -C /data
        
        log_info "✓ Orthanc data restored"
    fi
}

#############################################################################
# Start Services
#############################################################################

start_services() {
    log_info "Starting services..."
    
    cd "$PROJECT_ROOT"
    docker-compose up -d
    
    # Wait for services
    log_info "Waiting for services to start..."
    sleep 10
    
    log_info "✓ Services started"
}

#############################################################################
# Verify Restore
#############################################################################

verify_restore() {
    log_info "Verifying restore..."
    
    # Check database connection
    if docker exec geteway-postgres-1 psql -U relaypacs -d relaypacs -c "SELECT count(*) FROM users;" > /dev/null 2>&1; then
        log_info "✓ Database is accessible"
    else
        log_error "Database verification failed"
        return 1
    fi
    
    # Check backend health
    sleep 5
    if curl -sf http://localhost:8003/health > /dev/null 2>&1; then
        log_info "✓ Backend is healthy"
    else
        log_warn "Backend health check failed (may need more time to start)"
    fi
    
    log_info "✓ Restore verification completed"
}

#############################################################################
# Main Execution
#############################################################################

main() {
    log_info "======================================"
    log_info "RelayPACS Restore"
    log_info "Backup: $BACKUP_DIR"
    log_info "======================================"
    
    validate_backup
    confirm_restore
    stop_services
    restore_postgres
    restore_sqlite
    restore_config
    restore_volumes
    start_services
    verify_restore
    
    log_info "======================================"
    log_info "✓ Restore completed successfully!"
    log_info "Backend: http://localhost:8003"
    log_info "Frontend: http://localhost:3002"
    log_info "======================================"
}

# Run main function
main "$@"
