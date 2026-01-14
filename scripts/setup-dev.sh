#!/bin/bash

###############################################################################
# RelayPACS Local Development Setup Script
###############################################################################
# This script sets up your local development environment
# Run this once to initialize everything
###############################################################################

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}===${NC} $1 ${BLUE}===${NC}\n"
}

###############################################################################
# Check Prerequisites
###############################################################################

check_prerequisites() {
    log_step "Checking Prerequisites"

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker Desktop."
        exit 1
    fi
    log_info "✓ Docker found: $(docker --version)"

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed."
        exit 1
    fi
    log_info "✓ Docker Compose found: $(docker-compose --version)"

    # Check Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    log_info "✓ Docker is running"
}

###############################################################################
# Environment Files
###############################################################################

setup_env_files() {
    log_step "Setting Up Environment Files"

    cd "$PROJECT_ROOT"

    # Backend .env
    if [ ! -f "backend/.env" ]; then
        log_info "Creating backend/.env from template..."
        cp backend/.env.example backend/.env
        log_info "✓ Created backend/.env"
    else
        log_info "✓ backend/.env already exists"
    fi

    # Frontend .env
    if [ ! -f "frontend/.env" ]; then
        log_info "Creating frontend/.env from template..."
        cp frontend/.env.example frontend/.env
        log_info "✓ Created frontend/.env"
    else
        log_info "✓ frontend/.env already exists"
    fi
}

###############################################################################
# Start Docker Services
###############################################################################

start_services() {
    log_step "Starting Docker Services"

    cd "$PROJECT_ROOT"

    log_info "Building and starting all services..."
    docker-compose up -d

    log_info "Waiting for services to be ready..."
    sleep 10

    # Check service status
    log_info "\nService Status:"
    docker-compose ps
}

###############################################################################
# Database Setup
###############################################################################

setup_database() {
    log_step "Setting Up Database"

    cd "$PROJECT_ROOT"

   log_info "Waiting for PostgreSQL to be ready..."
    for i in {1..30}; do
        if docker exec geteway-postgres-1 pg_isready -U relaypacs > /dev/null 2>&1; then
            log_info "✓ PostgreSQL is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "PostgreSQL did not become ready in time"
            exit 1
        fi
        sleep 1
    done

    log_info "Running database migrations..."
    docker-compose exec -T backend alembic upgrade head
    log_info "✓ Database migrations completed"
}

###############################################################################
# Create Test Data
###############################################################################

create_test_user() {
    log_step "Creating Test User"

    cd "$PROJECT_ROOT"

    log_info "Creating test user (testuser/testpass)..."
    docker-compose exec -T backend python << 'EOF'
from app.db.database import SessionLocal
from app.models.user import User
from app.auth.password import get_password_hash

try:
    db = SessionLocal()

    # Check if user exists
    existing = db.query(User).filter(User.username == 'testuser').first()
    if existing:
        print("Test user already exists")
    else:
        user = User(
            username='testuser',
            email='test@relaypacs.local',
            full_name='Test User',
            hashed_password=get_password_hash('testpass'),
            is_active=True,
            role='radiologist'
        )
        db.add(user)
        db.commit()
        print("✓ Test user created successfully")
    db.close()
except Exception as e:
    print(f"Note: {e}")
    print("This is okay if the users table doesn't exist yet")
EOF
}

###############################################################################
# Verify Installation
###############################################################################

verify_setup() {
    log_step "Verifying Setup"

    # Check backend health
    log_info "Checking backend health..."
    for i in {1..20}; do
        if curl -sf http://localhost:8003/health > /dev/null 2>&1; then
            log_info "✓ Backend is healthy"
            break
        fi
        if [ $i -eq 20 ]; then
            log_warn "Backend health check timed out (this is okay if still starting)"
        fi
        sleep 1
    done

    # Check frontend
    log_info "Checking frontend..."
    if curl -sf http://localhost:3002 > /dev/null 2>&1; then
        log_info "✓ Frontend is accessible"
    else
        log_warn "Frontend not yet accessible (may still be building)"
    fi

    # Check PostgreSQL
    if docker exec geteway-postgres-1 pg_isready -U relaypacs > /dev/null 2>&1; then
        log_info "✓ PostgreSQL is running"
    else
        log_warn "PostgreSQL check failed"
    fi

    # Check Redis
    if docker exec geteway-redis-1 redis-cli ping 2>&1 | grep -q PONG; then
        log_info "✓ Redis is running"
    else
        log_warn "Redis check failed"
    fi
}

###############################################################################
# Print Summary
###############################################################################

print_summary() {
    log_step "Setup Complete!"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  🎉 RelayPACS is ready for local development!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  📱 Frontend (PWA):        http://localhost:3002"
    echo "  🔧 Backend API Docs:      http://localhost:8003/docs"
    echo "  ❤️  Health Check:          http://localhost:8003/health"
    echo ""
    echo "  🔐 Test Credentials:      testuser / testpass"
    echo ""
    echo "  📊 Monitoring:"
    echo "     - Grafana:             http://localhost:3000 (admin/admin)"
    echo "     - Prometheus:          http://localhost:9090"
    echo ""
    echo "  🏥 PACS Servers:"
    echo "     - Orthanc:             http://localhost:8042"
    echo "     - dcm4chee:            http://localhost:8081"
    echo ""
    echo "  💾 Storage:"
    echo "     - MinIO Console:       http://localhost:9001 (minioadmin/minioadmin)"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  📖 Documentation:"
    echo "     - Local Development:   docs/local_development.md"
    echo "     - PACS Integration:    docs/pacs_integration_guide.md"
    echo ""
    echo "  🔍 Useful Commands:"
    echo "     - View logs:           docker-compose logs -f"
    echo "     - Restart backend:     docker-compose restart backend"
    echo "     - Stop all:            docker-compose down"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

###############################################################################
# Main Execution
###############################################################################

main() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  RelayPACS Local Development Setup"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    check_prerequisites
    setup_env_files
    start_services
    setup_database
    create_test_user
    verify_setup
    print_summary

    log_info "Happy coding! 🚀"
    echo ""
}

# Run main function
main "$@"
