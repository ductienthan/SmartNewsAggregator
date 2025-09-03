#!/bin/bash

# Script to create an admin user in the database
# Usage: ./scripts/create-admin.sh

set -e

echo "🔐 Creating admin user..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one from env.example"
    exit 1
fi

# Load environment variables
source .env

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in .env file"
    exit 1
fi

# Check if HASH_SECRET is set
if [ -z "$HASH_SECRET" ]; then
    echo "❌ HASH_SECRET not set in .env file"
    exit 1
fi

echo "📝 Creating admin user with email: admin@smartnews.com"
echo "🔑 Password: admin123"

# Create admin user using Prisma
npx prisma db execute --stdin <<< "
-- Create admin user
INSERT INTO \"User\" (id, email, \"passwordHash\", role, timezone, \"createdAt\")
VALUES (
    'admin_' || gen_random_uuid()::text,
    'admin@smartnews.com',
    -- This is a hash of 'admin123' with the HASH_SECRET
    -- In production, you should use a proper password hashing library
    encode(sha256('admin123' || '$HASH_SECRET'), 'hex'),
    'ADMIN',
    'America/Los_Angeles',
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    role = 'ADMIN',
    \"updatedAt\" = NOW();
"

echo "✅ Admin user created successfully!"
echo "📧 Email: admin@smartnews.com"
echo "🔑 Password: admin123"
echo "👑 Role: ADMIN"
echo ""
echo "🚀 You can now login with these credentials to test admin endpoints" 