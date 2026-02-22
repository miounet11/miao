#!/bin/bash
# Health Check Script
# Verifies deployment health and service availability

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "====================================="
echo "  Miaoda IDE - Health Check"
echo "====================================="
echo ""

# Configuration
HOST="${HOST:-localhost}"
PORT="${PORT:-3000}"
PROTOCOL="${PROTOCOL:-http}"
TIMEOUT="${TIMEOUT:-30}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_failure() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "  $1"
}

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing $test_name... "

    if eval "$test_command" > /dev/null 2>&1; then
        print_success "PASSED"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        print_failure "FAILED"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Function to check HTTP endpoint
check_http() {
    local url="$1"
    local expected_status="${2:-200}"

    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
    [ "$response" = "$expected_status" ]
}

# Function to check service is listening
check_port() {
    local host="$1"
    local port="$2"

    if command -v nc > /dev/null 2>&1; then
        nc -z -w5 "$host" "$port" 2>/dev/null
    elif command -v telnet > /dev/null 2>&1; then
        timeout 5 telnet "$host" "$port" 2>/dev/null | grep -q "Connected"
    else
        curl -s --max-time 5 "http://$host:$port" > /dev/null 2>&1
    fi
}

echo "Target: $PROTOCOL://$HOST:$PORT"
echo ""

# Basic connectivity tests
echo "=== Basic Connectivity ==="
run_test "Port $PORT is open" "check_port $HOST $PORT"
run_test "Health endpoint" "check_http $PROTOCOL://$HOST:$PORT/health 200"
echo ""

# Service-specific tests
echo "=== Service Tests ==="

# Check if server is responding
if check_http "$PROTOCOL://$HOST:$PORT/health" 200; then
    print_success "Server is responding"

    # Get health details
    HEALTH_RESPONSE=$(curl -s --max-time "$TIMEOUT" "$PROTOCOL://$HOST:$PORT/health" 2>/dev/null || echo "{}")

    if [ -n "$HEALTH_RESPONSE" ] && [ "$HEALTH_RESPONSE" != "{}" ]; then
        print_info "Health response: $HEALTH_RESPONSE"
    fi
else
    print_failure "Server is not responding"
fi

# Check response time
echo -n "Testing response time... "
START_TIME=$(date +%s%N)
if curl -s --max-time "$TIMEOUT" "$PROTOCOL://$HOST:$PORT/health" > /dev/null 2>&1; then
    END_TIME=$(date +%s%N)
    RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

    if [ "$RESPONSE_TIME" -lt 1000 ]; then
        print_success "${RESPONSE_TIME}ms (excellent)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    elif [ "$RESPONSE_TIME" -lt 3000 ]; then
        print_warning "${RESPONSE_TIME}ms (acceptable)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_failure "${RESPONSE_TIME}ms (slow)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
else
    print_failure "No response"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

echo ""

# Docker-specific checks (if running in Docker)
if command -v docker > /dev/null 2>&1; then
    echo "=== Docker Health ==="

    # Check if containers are running
    if docker ps --format '{{.Names}}' | grep -q "miaoda"; then
        CONTAINERS=$(docker ps --filter "name=miaoda" --format "{{.Names}} ({{.Status}})")
        while IFS= read -r container; do
            print_success "Container: $container"
        done <<< "$CONTAINERS"

        # Check container health
        UNHEALTHY=$(docker ps --filter "name=miaoda" --filter "health=unhealthy" --format "{{.Names}}")
        if [ -n "$UNHEALTHY" ]; then
            print_failure "Unhealthy containers: $UNHEALTHY"
        fi
    else
        print_warning "No Miaoda containers found"
    fi

    echo ""
fi

# System resource checks
echo "=== System Resources ==="

if command -v free > /dev/null 2>&1; then
    MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    print_info "Memory usage: ${MEMORY_USAGE}%"
fi

if command -v df > /dev/null 2>&1; then
    DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')
    print_info "Disk usage: $DISK_USAGE"
fi

if command -v uptime > /dev/null 2>&1; then
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}')
    print_info "Load average:$LOAD_AVG"
fi

echo ""

# Summary
echo "====================================="
echo "  Health Check Summary"
echo "====================================="
echo "Total tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ "$FAILED_TESTS" -eq 0 ]; then
    print_success "All health checks passed!"
    exit 0
else
    print_failure "Some health checks failed!"
    exit 1
fi
