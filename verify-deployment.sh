#!/bin/bash

# Railway Deployment Verification Script
# This script verifies that your Railway deployment is working correctly

echo "========================================="
echo "Railway Deployment Verification"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Prompt for URLs
read -p "Enter your BACKEND Railway URL (e.g., https://backend.up.railway.app): " BACKEND_URL
read -p "Enter your FRONTEND Railway URL (e.g., https://frontend.up.railway.app): " FRONTEND_URL

echo ""
echo "Testing deployment with:"
echo "Backend: $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""

# Function to check HTTP status
check_endpoint() {
    local url=$1
    local expected_status=$2
    local description=$3

    echo -n "Testing $description... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 30)

    if [ "$response" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected_status)"
        return 1
    fi
}

# Function to test JSON response
check_json_endpoint() {
    local url=$1
    local description=$2

    echo -n "Testing $description... "

    response=$(curl -s "$url" --max-time 30)
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 30)

    if [ "$http_code" -eq 200 ] && [ -n "$response" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        echo "  Response: ${response:0:100}..."
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        return 1
    fi
}

echo "========================================="
echo "1. Backend Health Checks"
echo "========================================="
echo ""

# Test backend health endpoint
check_json_endpoint "$BACKEND_URL/api/health" "Backend Health Endpoint"
echo ""

# Test backend root
check_endpoint "$BACKEND_URL" 200 "Backend Root"
echo ""

echo "========================================="
echo "2. Frontend Health Checks"
echo "========================================="
echo ""

# Test frontend
check_endpoint "$FRONTEND_URL" 200 "Frontend Homepage"
echo ""

echo "========================================="
echo "3. API Endpoint Tests"
echo "========================================="
echo ""

# Test login endpoint (should return 400/401 without credentials)
echo -n "Testing Login Endpoint... "
login_response=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"","password":""}' \
    --max-time 30)
login_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"","password":""}' \
    --max-time 30)

if [ "$login_status" -eq 400 ] || [ "$login_status" -eq 401 ]; then
    echo -e "${GREEN}✓ PASS${NC} (API responding correctly)"
else
    echo -e "${RED}✗ FAIL${NC} (HTTP $login_status)"
fi
echo ""

echo "========================================="
echo "4. Test Authentication with Admin User"
echo "========================================="
echo ""

echo -n "Testing Admin Login... "
auth_response=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"admin123"}' \
    --max-time 30)

if echo "$auth_response" | grep -q "token"; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "  Admin login successful"

    # Extract token
    TOKEN=$(echo "$auth_response" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

    if [ -n "$TOKEN" ]; then
        echo "  Token received: ${TOKEN:0:20}..."

        # Test authenticated endpoint
        echo ""
        echo -n "Testing Authenticated Endpoint (Get User)... "
        user_response=$(curl -s "$BACKEND_URL/api/auth/me" \
            -H "Authorization: Bearer $TOKEN" \
            --max-time 30)

        if echo "$user_response" | grep -q "admin@example.com"; then
            echo -e "${GREEN}✓ PASS${NC}"
            echo "  User data retrieved successfully"
        else
            echo -e "${RED}✗ FAIL${NC}"
            echo "  Response: $user_response"
        fi
    fi
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Response: $auth_response"
fi
echo ""

echo "========================================="
echo "5. Database Connection Test"
echo "========================================="
echo ""

echo -n "Testing Database (via Users API)... "
if [ -n "$TOKEN" ]; then
    users_response=$(curl -s "$BACKEND_URL/api/users" \
        -H "Authorization: Bearer $TOKEN" \
        --max-time 30)

    if echo "$users_response" | grep -q "@example.com"; then
        echo -e "${GREEN}✓ PASS${NC}"
        echo "  Database connection working"
    else
        echo -e "${YELLOW}⚠ WARNING${NC}"
        echo "  Response: ${users_response:0:100}..."
    fi
else
    echo -e "${YELLOW}⚠ SKIPPED${NC} (No auth token)"
fi
echo ""

echo "========================================="
echo "6. CORS Configuration Test"
echo "========================================="
echo ""

echo -n "Testing CORS headers... "
cors_response=$(curl -s -I -X OPTIONS "$BACKEND_URL/api/health" \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: GET" \
    --max-time 30)

if echo "$cors_response" | grep -q "Access-Control-Allow-Origin"; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "  CORS configured correctly"
else
    echo -e "${YELLOW}⚠ WARNING${NC}"
    echo "  CORS headers may need configuration"
fi
echo ""

echo "========================================="
echo "7. Scheduler Test"
echo "========================================="
echo ""

echo -n "Testing Scheduler Initialization... "
echo -e "${YELLOW}ℹ INFO${NC}"
echo "  Check Railway backend logs for:"
echo "  - 'Scheduler initialized:'"
echo "  - 'Friday 3 PM JST: Weekly report reminder'"
echo "  - 'Saturday 10 AM JST: Escalation to leader'"
echo "  - 'Sunday 7 PM JST: Escalation to leader + GM/BOD'"
echo ""

echo "========================================="
echo "Summary"
echo "========================================="
echo ""

echo "Manual Verification Steps:"
echo ""
echo "1. Open frontend: $FRONTEND_URL"
echo "   - Should see login page with no errors"
echo "   - Should have valid SSL certificate (🔒)"
echo ""
echo "2. Login with admin credentials:"
echo "   - Email: admin@example.com"
echo "   - Password: admin123"
echo ""
echo "3. Check these pages work:"
echo "   - Dashboard"
echo "   - Applications list"
echo "   - Weekly Reports (should show reminder banner if no report)"
echo "   - System Settings (email & escalation config)"
echo "   - User Management"
echo ""
echo "4. Check Railway Logs:"
echo "   - Backend: Settings → Logs"
echo "   - Look for 'Database initialized'"
echo "   - Look for 'Scheduler initialized'"
echo "   - Check for any errors"
echo ""

echo "========================================="
echo "Need Help?"
echo "========================================="
echo ""
echo "If any tests failed, provide:"
echo "1. The failed test name"
echo "2. The error message"
echo "3. Railway backend logs"
echo ""
echo "Verification complete!"
