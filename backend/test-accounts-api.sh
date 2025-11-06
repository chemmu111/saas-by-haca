#!/bin/bash

# Test script for Accounts API
# Usage: ./test-accounts-api.sh

BASE_URL="http://localhost:5000"

echo "=== Accounts API Test Script ==="
echo ""

# Step 1: Login to get token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Please check your credentials."
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo "Token: ${TOKEN:0:20}..."
echo ""

# Step 2: List accounts
echo "2. Listing connected accounts..."
LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/api/accounts/list" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$LIST_RESPONSE" | jq '.' 2>/dev/null || echo "$LIST_RESPONSE"
echo ""

# Step 3: Get OAuth URL (if you want to test connect)
echo "3. Getting OAuth connect URL for Meta..."
OAUTH_RESPONSE=$(curl -s -X GET "$BASE_URL/oauth/connect/meta" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response:"
echo "$OAUTH_RESPONSE" | jq '.' 2>/dev/null || echo "$OAUTH_RESPONSE"
echo ""

echo "=== Test Complete ==="
echo ""
echo "To test refresh/disconnect, you'll need an account ID from the list above."

