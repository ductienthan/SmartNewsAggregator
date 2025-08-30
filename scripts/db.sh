#!/bin/bash

# Database Management Script for Smart News Aggregator

set -e

echo "🗄️  Smart News Aggregator - Database Management"

# Function to check if database is accessible
check_database() {
    echo "🔍 Checking database connection..."
    if pnpm prisma:migrate:deploy --dry-run > /dev/null 2>&1; then
        echo "✅ Database connection successful!"
        return 0
    else
        echo "❌ Database connection failed!"
        return 1
    fi
}

# Function to generate Prisma client
generate_client() {
    echo "🔧 Generating Prisma client..."
    pnpm prisma:generate
    echo "✅ Prisma client generated!"
}

# Function to create a new migration
create_migration() {
    if [ -z "$1" ]; then
        echo "❌ Migration name is required!"
        echo "Usage: $0 migrate:dev <migration_name>"
        exit 1
    fi
    
    echo "📝 Creating new migration: $1"
    pnpm prisma:migrate:dev --name "$1"
    echo "✅ Migration created successfully!"
}

# Function to deploy migrations
deploy_migrations() {
    echo "🚀 Deploying migrations..."
    pnpm prisma:migrate:deploy
    echo "✅ Migrations deployed successfully!"
}

# Function to reset database
reset_database() {
    echo "⚠️  WARNING: This will delete all data in the database!"
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Resetting database..."
        pnpm prisma:migrate:reset
        echo "✅ Database reset successfully!"
    else
        echo "❌ Database reset cancelled."
    fi
}

# Function to push schema changes (for development)
push_schema() {
    echo "📤 Pushing schema changes to database..."
    pnpm prisma:db:push
    echo "✅ Schema changes pushed successfully!"
}

# Function to seed database
seed_database() {
    echo "🌱 Seeding database..."
    pnpm prisma:db:seed
    echo "✅ Database seeded successfully!"
}

# Function to setup database (generate + migrate)
setup_database() {
    echo "🔧 Setting up database..."
    generate_client
    deploy_migrations
    echo "✅ Database setup completed!"
}

# Function to show migration status
show_status() {
    echo "📊 Migration Status:"
    pnpm prisma:migrate:status
}

# Function to open Prisma Studio
open_studio() {
    echo "🔍 Opening Prisma Studio..."
    pnpm prisma:studio
}

# Function to show database schema
show_schema() {
    echo "📋 Database Schema:"
    cat prisma/schema.prisma
}

# Function to validate schema
validate_schema() {
    echo "✅ Validating Prisma schema..."
    pnpm prisma:generate
    echo "✅ Schema is valid!"
}

# Function to create initial migration
create_initial_migration() {
    echo "🚀 Creating initial migration..."
    pnpm prisma:migrate:dev --name "init"
    echo "✅ Initial migration created!"
}

# Function to show help
show_help() {
    echo "Usage: $0 {command} [options]"
    echo ""
    echo "Commands:"
    echo "  setup                    - Generate client and deploy migrations"
    echo "  generate                 - Generate Prisma client"
    echo "  migrate:dev <name>       - Create new migration with name"
    echo "  migrate:deploy           - Deploy pending migrations"
    echo "  migrate:reset            - Reset database (WARNING: deletes all data)"
    echo "  migrate:status           - Show migration status"
    echo "  db:push                  - Push schema changes (development only)"
    echo "  db:seed                  - Seed database with initial data"
    echo "  validate                 - Validate Prisma schema"
    echo "  studio                   - Open Prisma Studio"
    echo "  schema                   - Show database schema"
    echo "  check                    - Check database connection"
    echo "  init                     - Create initial migration"
    echo "  help                     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup                 # Setup database for first time"
    echo "  $0 migrate:dev add_users # Create migration for adding users table"
    echo "  $0 migrate:deploy        # Deploy pending migrations"
    echo "  $0 db:seed               # Seed database with sample data"
}

# Main script logic
case "$1" in
    "setup")
        setup_database
        ;;
    "generate")
        generate_client
        ;;
    "migrate:dev")
        create_migration "$2"
        ;;
    "migrate:deploy")
        deploy_migrations
        ;;
    "migrate:reset")
        reset_database
        ;;
    "migrate:status")
        show_status
        ;;
    "db:push")
        push_schema
        ;;
    "db:seed")
        seed_database
        ;;
    "validate")
        validate_schema
        ;;
    "studio")
        open_studio
        ;;
    "schema")
        show_schema
        ;;
    "check")
        check_database
        ;;
    "init")
        create_initial_migration
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac 