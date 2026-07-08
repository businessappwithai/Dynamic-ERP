#!/bin/bash
cd "/Users/pramodkoshy/projects/dynamic/test/app-with-ai/generated-projects/proj_1769269156396_69m2d66eu/backend"

# Start the backend server
bun run start &
SERVER_PID=$!

# Wait for server to start
sleep 8

# Test OData endpoints
echo "Testing OData endpoints..."
echo ""
echo "1. Checking \$metadata for SysReferences:"
curl -s "http://localhost:3002/odata/\$metadata" | grep -i "SysReference" | head -5

echo ""
echo "2. Checking \$metadata for SysRoles:"
curl -s "http://localhost:3002/odata/\$metadata" | grep -i "SysRole" | head -5

echo ""
echo "3. Checking \$metadata for SysUsers:"
curl -s "http://localhost:3002/odata/\$metadata" | grep -i "SysUser" | head -5

echo ""
echo "4. Checking \$metadata for SysFields:"
curl -s "http://localhost:3002/odata/\$metadata" | grep -i "SysField" | head -5

echo ""
echo "5. Testing SysReferences endpoint:"
curl -s "http://localhost:3002/odata/SysReferences?\\\$top=2"

echo ""
echo "6. Testing SysRoles endpoint:"
curl -s "http://localhost:3002/odata/SysRoles?\\\$top=2"

echo ""
echo "7. Testing SysUsers endpoint:"
curl -s "http://localhost:3002/odata/SysUsers?\\\$top=2"

echo ""
echo "8. Testing SysFields endpoint:"
curl -s "http://localhost:3002/odata/SysFields?\\\$top=2"

# Kill the server
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "All tests completed!"
