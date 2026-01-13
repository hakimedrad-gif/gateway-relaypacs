#!/bin/bash

#############################################################################
# RelayPACS Deployment Script
#############################################################################
# This script automates the deployment of RelayPACS to production/staging
#
# Usage:
#   ./scripts/deploy.sh [environment]
#
# Examples:
#   ./scripts/deploy.sh production
#   ./scripts/deploy.sh staging
#############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
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
# Pre-deployment Checks
#############################################################################

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    # Check if docker-compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi

    # Check if environment file exists
    if [ ! -f "$PROJECT_ROOT/deployment/$ENVIRONMENT.env" ]; then
        log_error "Environment file not found: deployment/$ENVIRONMENT.env"
        log_info "Please create it from deployment/production.env.example"
        exit 1
    fi

    log_info "✓ All prerequisites met"
}

#############################################################################
# Backup Current Deployment
#############################################################################

backup_current_deployment() {
    log_info "Creating backup of current deployment..."

    # Create backup directory
    BACKUP_DIR="$PROJECT_ROOT/backups/deploy_$TIMESTAMP"
    mkdir -p "$BACKUP_DIR"

    # Backup database
    if docker ps | grep -q "geteway-postgres-1"; then
        log_info "Backing up PostgreSQL database..."
        docker exec geteway-postgres-1 pg_dump -U relaypacs relaypacs > "$BACKUP_DIR/database_backup.sql"
        log_info "✓ Database backed up to $BACKUP_DIR/database_backup.sql"
    fi

    # Backup .env files
    if [ -f "$PROJECT_ROOT/backend/.env" ]; then
        cp "$PROJECT_ROOT/backend/.env" "$BACKUP_DIR/backend.env.backup"
    fi

    if [ -f "$PROJECT_ROOT/frontend/.env" ]; then
        cp "$PROJECT_ROOT/frontend/.env" "$BACKUP_DIR/frontend.env.backup"
    fi

    # Backup docker-compose.yml
    cp "$PROJECT_ROOT/docker-compose.yml" "$BACKUP_DIR/docker-compose.yml.backup"

    log_info "✓ Backup completed: $BACKUP_DIR"
}

#############################################################################
# Deploy Application
#############################################################################

deploy_application() {
    log_info "Deploying RelayPACS to $ENVIRONMENT..."

    cd "$PROJECT_ROOT"

    # Load environment variables
    set -a
    source "deployment/$ENVIRONMENT.env"
    set +a

    # Pull latest images (if using registry)
    if [ "${PULL_IMAGES:-false}" = "true" ]; then
        log_info "Pulling latest Docker images..."
        docker-compose pull
    fi

    # Build images
    log_info "Building Docker images..."
    docker-compose build --no-cache

    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose down

    # Start services
    log_info "Starting services..."
    docker-compose up -d

    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 10

    # Run database migrations
    log_info "Running database migrations..."
    docker-compose exec -T backend alembic upgrade head

    log_info "✓ Deployment completed successfully"
}

#############################################################################
# Health Checks
#############################################################################

verify_deployment() {
    log_info "Verifying deployment..."

    # Wait for backend to start
    MAX_RETRIES=30
    RETRY_COUNT=0

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -sf http://localhost:8003/health > /dev/null 2>&1; then
            log_info "✓ Backend is healthy"
            break
        fi

        RETRY_COUNT=$((RETRY_COUNT + 1))
        log_info "Waiting for backend... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    done

    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        log_error "Backend health check failed"
        return 1
    fi

    # Check frontend
    if curl -sf http://localhost:3002 > /dev/null 2>&1; then
        log_info "✓ Frontend is healthy"
    else
        log_warn "Frontend health check failed"
    fi

    # Check database
    if docker exec geteway-postgres-1 pg_isready -U relaypacs > /dev/null 2>&1; then
        log_info "✓ Database is healthy"
    else
        log_error "Database health check failed"
        return 1
    fi

    # Check Redis
    if docker exec geteway-redis-1 redis-cli ping | grep -q PONG; then
        log_info "✓ Redis is healthy"
    else
        log_warn "Redis health check failed"
    fi

    log_info "✓ Deployment verification completed"
}

#############################################################################
# Post-Deployment Tasks
#############################################################################

post_deployment() {
    log_info "Running post-deployment tasks..."

    # Show running containers
    log_info "Running containers:"
    docker-compose ps

    # Show logs (last 50 lines)
    log_info "\nRecent logs:"
    docker-compose logs --tail=50

    log_info "\n✓ Deployment completed successfully!"
    log_info "Backend: http://localhost:8003"
    log_info "Frontend: http://localhost:3002"
    log_info "Backup location: $BACKUP_DIR"
}

#############################################################################
# Rollback Function
#############################################################################

rollback() {
    log_error "Deployment failed! Rolling back..."

    # Stop current containers
    docker-compose down

    # Restore backup if available
    if [ -d "$BACKUP_DIR" ]; then
        log_info "Restoring from backup: $BACKUP_DIR"

        # Restore database
        if [ -f "$BACKUP_DIR/database_backup.sql" ]; then
            docker-compose up -d postgres
            sleep 5
            docker exec -i geteway-postgres-1 psql -U relaypacs relaypacs < "$BACKUP_DIR/database_backup.sql"
        fi

        # Restore env files
        if [ -f "$BACKUP_DIR/backend.env.backup" ]; then
            cp "$BACKUP_DIR/backend.env.backup" "$PROJECT_ROOT/backend/.env"
        fi

        if [ -f "$BACKUP_DIR/frontend.env.backup" ]; then
            cp "$BACKUP_DIR/frontend.env.backup" "$PROJECT_ROOT/frontend/.env"
        fi

        # Restart with old configuration
        docker-compose up -d

        log_info "✓ Rollback completed"
    else
        log_error "No backup found to rollback to"
    fi

    exit 1
}

#############################################################################
# Main Execution
#############################################################################

main() {
    log_info "======================================"
    log_info "RelayPACS Deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Timestamp: $TIMESTAMP"
    log_info "======================================"

    # Trap errors and rollback
    trap rollback ERR

    check_prerequisites
    backup_current_deployment
    deploy_application
    verify_deployment
    post_deployment

    log_info "\n✓ All deployment steps completed successfully!"
}

# Run main function
main "$@"
