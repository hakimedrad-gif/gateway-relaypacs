#!/bin/bash

# RelayPACS Local Development Infrastructure Verification Script
# This script verifies that the local development environment is set up according to
# the Infrastructure & DevOps documentation requirements

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Print functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((CHECKS_PASSED++))
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((CHECKS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    ((CHECKS_WARNING++))
}

print_info() {
    echo -e "    $1"
}

# Check functions
check_docker() {
    print_header "Checking Docker Installation"

    print_check "Docker installation"
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
        print_success "Docker installed: $DOCKER_VERSION"
    else
        print_error "Docker is not installed"
        print_info "Install Docker: https://docs.docker.com/engine/install/"
        return 1
    fi

    print_check "Docker Compose installation"
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version 2>/dev/null || docker compose version | awk '{print $4}')
        print_success "Docker Compose installed: $COMPOSE_VERSION"
    else
        print_error "Docker Compose is not installed"
        print_info "Install Docker Compose: https://docs.docker.com/compose/install/"
        return 1
    fi

    print_check "Docker daemon status"
    if docker info &> /dev/null; then
        print_success "Docker daemon is running"
    else
        print_error "Docker daemon is not running"
        print_info "Start Docker: sudo systemctl start docker"
        return 1
    fi
}

check_python() {
    print_header "Checking Python Installation"

    print_check "Python 3.12+ installation"
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | awk '{print $2}')
        PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
        PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

        if [ "$PYTHON_MAJOR" -ge 3 ] && [ "$PYTHON_MINOR" -ge 12 ]; then
            print_success "Python installed: $PYTHON_VERSION (meets requirement: 3.12+)"
        else
            print_warning "Python $PYTHON_VERSION installed (recommended: 3.12+)"
        fi
    else
        print_error "Python 3 is not installed"
        return 1
    fi
}

check_node() {
    print_header "Checking Node.js Installation"

    print_check "Node.js installation"
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js installed: $NODE_VERSION"
    else
        print_error "Node.js is not installed"
        print_info "Install Node.js: https://nodejs.org/"
        return 1
    fi

    print_check "npm installation"
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm installed: $NPM_VERSION"
    else
        print_error "npm is not installed"
        return 1
    fi
}

check_env_files() {
    print_header "Checking Environment Configuration"

    print_check "Backend .env file"
    if [ -f "backend/.env" ]; then
        print_success "backend/.env exists"

        # Check critical environment variables
        print_check "Backend environment variables"
        REQUIRED_VARS=("SECRET_KEY" "DATABASE_URL" "S3_ENDPOINT" "ORTHANC_URL" "REDIS_URL")
        MISSING_VARS=()

        for VAR in "${REQUIRED_VARS[@]}"; do
            if grep -q "^${VAR}=" backend/.env; then
                VALUE=$(grep "^${VAR}=" backend/.env | cut -d= -f2)
                if [ -z "$VALUE" ]; then
                    MISSING_VARS+=("$VAR (empty)")
                fi
            else
                MISSING_VARS+=("$VAR (not found)")
            fi
        done

        if [ ${#MISSING_VARS[@]} -eq 0 ]; then
            print_success "All required backend environment variables are set"
        else
            print_warning "Some backend environment variables need attention:"
            for VAR in "${MISSING_VARS[@]}"; do
                print_info "- $VAR"
            done
        fi

        # Check for production secret key
        if grep -q "SECRET_KEY=dev-secret-key-change-in-production" backend/.env; then
            print_warning "Using default SECRET_KEY (acceptable for development)"
            print_info "For production, generate a secure key: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
        fi
    else
        print_error "backend/.env does not exist"
        print_info "Copy backend/.env.example to backend/.env and configure it"
        return 1
    fi

    print_check "Frontend .env file"
    if [ -f "frontend/.env" ]; then
        print_success "frontend/.env exists"

        if grep -q "^VITE_API_URL=" frontend/.env; then
            API_URL=$(grep "^VITE_API_URL=" frontend/.env | cut -d= -f2)
            print_success "VITE_API_URL is set: $API_URL"
        else
            print_warning "VITE_API_URL not found in frontend/.env"
        fi
    else
        print_error "frontend/.env does not exist"
        print_info "Copy frontend/.env.example to frontend/.env and configure it"
        return 1
    fi
}

check_docker_compose() {
    print_header "Checking Docker Compose Configuration"

    print_check "docker-compose.yml file"
    if [ -f "docker-compose.yml" ]; then
        print_success "docker-compose.yml exists"
    else
        print_error "docker-compose.yml does not exist"
        return 1
    fi

    print_check "Required services in docker-compose.yml"
    REQUIRED_SERVICES=("backend" "frontend" "postgres" "redis" "minio" "orthanc" "prometheus" "grafana" "postgres-exporter" "redis-exporter")
    MISSING_SERVICES=()

    for SERVICE in "${REQUIRED_SERVICES[@]}"; do
        if grep -q "^  ${SERVICE}:" docker-compose.yml; then
            continue
        else
            MISSING_SERVICES+=("$SERVICE")
        fi
    done

    if [ ${#MISSING_SERVICES[@]} -eq 0 ]; then
        print_success "All required services are defined in docker-compose.yml"
    else
        print_warning "Some recommended services are missing from docker-compose.yml:"
        for SERVICE in "${MISSING_SERVICES[@]}"; do
            print_info "- $SERVICE"
        done
    fi
}

check_monitoring_config() {
    print_header "Checking Monitoring Configuration"

    print_check "Prometheus configuration"
    if [ -f "monitoring/prometheus/prometheus.yml" ]; then
        print_success "monitoring/prometheus/prometheus.yml exists"

        # Check for backend scraping
        if grep -q "job_name.*backend" monitoring/prometheus/prometheus.yml || grep -q "job_name.*relaypacs-backend" monitoring/prometheus/prometheus.yml; then
            print_success "Backend metrics scraping is configured"
        else
            print_warning "Backend metrics scraping not found in prometheus.yml"
        fi

        # Check for postgres scraping
        if grep -q "job_name.*postgres" monitoring/prometheus/prometheus.yml; then
            print_success "PostgreSQL metrics scraping is configured"
        else
            print_warning "PostgreSQL metrics scraping not found in prometheus.yml"
        fi

        # Check for redis scraping
        if grep -q "job_name.*redis" monitoring/prometheus/prometheus.yml; then
            print_success "Redis metrics scraping is configured"
        else
            print_warning "Redis metrics scraping not found in prometheus.yml"
        fi
    else
        print_error "monitoring/prometheus/prometheus.yml does not exist"
        print_info "Create monitoring configuration directory structure"
    fi

    print_check "Grafana provisioning"
    if [ -d "monitoring/grafana/provisioning" ]; then
        print_success "Grafana provisioning directory exists"
    else
        print_warning "monitoring/grafana/provisioning directory does not exist"
        print_info "Create Grafana provisioning configuration for dashboards"
    fi
}

check_docker_services() {
    print_header "Checking Docker Services Status"

    print_check "Docker containers"
    if docker ps -a &> /dev/null; then
        RUNNING_CONTAINERS=$(docker ps --format '{{.Names}}' | grep -E '^geteway-' | wc -l)
        TOTAL_CONTAINERS=$(docker ps -a --format '{{.Names}}' | grep -E '^geteway-' | wc -l)

        print_info "RelayPACS containers: $RUNNING_CONTAINERS running / $TOTAL_CONTAINERS total"

        if [ $RUNNING_CONTAINERS -eq 0 ]; then
            print_warning "No RelayPACS containers are currently running"
            print_info "Start services: docker-compose up -d"
        else
            # Check critical services
            CRITICAL_SERVICES=("geteway-backend-1" "geteway-postgres-1" "geteway-redis-1" "geteway-minio-1")
            ALL_CRITICAL_RUNNING=true

            for SERVICE in "${CRITICAL_SERVICES[@]}"; do
                if docker ps --format '{{.Names}}' | grep -q "^${SERVICE}$"; then
                    print_success "$SERVICE is running"
                else
                    print_warning "$SERVICE is not running"
                    ALL_CRITICAL_RUNNING=false
                fi
            done

            if [ "$ALL_CRITICAL_RUNNING" = false ]; then
                print_info "Start all services: docker-compose up -d"
            fi
        fi

        # Check monitoring services
        MONITORING_SERVICES=("prometheus" "grafana" "postgres-exporter" "redis-exporter")
        for SERVICE in "${MONITORING_SERVICES[@]}"; do
            if docker ps --format '{{.Names}}' | grep -q "^${SERVICE}$"; then
                print_success "$SERVICE is running"
            else
                print_warning "$SERVICE is not running"
            fi
        done
    else
        print_error "Cannot access Docker containers"
    fi
}

check_network_ports() {
    print_header "Checking Network Port Availability"

    PORTS=("8003:Backend API" "3002:Frontend" "5433:PostgreSQL" "6379:Redis" "9000:MinIO API" "9001:MinIO Console" "8045:Orthanc" "9090:Prometheus" "3000:Grafana")

    for PORT_INFO in "${PORTS[@]}"; do
        PORT=$(echo $PORT_INFO | cut -d: -f1)
        SERVICE=$(echo $PORT_INFO | cut -d: -f2)

        print_check "Port $PORT ($SERVICE)"
        if netstat -tuln 2>/dev/null | grep -q ":$PORT " || ss -tuln 2>/dev/null | grep -q ":$PORT "; then
            print_success "Port $PORT is in use (service likely running)"
        else
            print_warning "Port $PORT is not in use (service not running or different port)"
        fi
    done
}

check_directories() {
    print_header "Checking Directory Structure"

    REQUIRED_DIRS=("backend" "frontend" "monitoring" "monitoring/prometheus" "monitoring/grafana" "data" "scripts")

    for DIR in "${REQUIRED_DIRS[@]}"; do
        print_check "$DIR directory"
        if [ -d "$DIR" ]; then
            print_success "$DIR exists"
        else
            print_warning "$DIR does not exist"
            print_info "Create directory: mkdir -p $DIR"
        fi
    done
}

print_summary() {
    print_header "Verification Summary"

    echo -e "${GREEN}Passed:${NC}  $CHECKS_PASSED"
    echo -e "${RED}Failed:${NC}  $CHECKS_FAILED"
    echo -e "${YELLOW}Warnings:${NC} $CHECKS_WARNING"
    echo ""

    if [ $CHECKS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ Your local development infrastructure is properly configured!${NC}"
        echo ""
        echo "Next steps:"
        echo "  1. Start all services: docker-compose up -d"
        echo "  2. Check service health: docker-compose ps"
        echo "  3. View logs: docker-compose logs -f"
        echo "  4. Access Grafana: http://localhost:3000 (admin/admin)"
        echo "  5. Access Prometheus: http://localhost:9090"
        echo "  6. Access MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
        echo "  7. Access Backend API: http://localhost:8003/docs"
        echo "  8. Access Frontend: http://localhost:3002"
    else
        echo -e "${RED}✗ Some critical checks failed. Please fix the issues above.${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║  RelayPACS Local Development Infrastructure Verification      ║"
    echo "║  Verifying setup according to Infrastructure & DevOps docs    ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    # Change to script directory's parent (project root)
    cd "$(dirname "$0")/.."

    # Run all checks
    check_docker || true
    check_python || true
    check_node || true
    check_directories || true
    check_env_files || true
    check_docker_compose || true
    check_monitoring_config || true
    check_docker_services || true
    check_network_ports || true

    # Print summary
    print_summary
}

# Run main function
main
