#!/bin/bash

# Production Deployment Script

set -e

echo "🚀 Smart News Aggregator - Production Deployment"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cat > .env << EOF
# Database Configuration
POSTGRES_PASSWORD=your_secure_password_here

# Redis Configuration
REDIS_PASSWORD=your_redis_password_here

# Application Configuration
NODE_ENV=production
EOF
    echo "📝 Please edit .env file with your secure passwords before continuing."
    exit 1
fi

# Load environment variables
source .env

# Function to deploy with migrations
deploy_with_migrations() {
    echo "📦 Building and deploying services..."
    
    # Build all services
    docker-compose -f docker-compose.prod.yml build
    
    # Start infrastructure services first
    echo "🔄 Starting PostgreSQL and Redis..."
    docker-compose -f docker-compose.prod.yml up -d postgres redis
    
    # Wait for database to be ready
    echo "⏳ Waiting for database to be ready..."
    sleep 15
    
    # Run migrations
    echo "🗄️  Running database migrations..."
    docker-compose -f docker-compose.prod.yml up migration
    
    # Check if migration was successful
    if [ $? -eq 0 ]; then
        echo "✅ Migrations completed successfully!"
        
        # Start application services
        echo "🚀 Starting API and Worker services..."
        docker-compose -f docker-compose.prod.yml up -d api worker
        
        echo "✅ Deployment completed successfully!"
        echo ""
        echo "📊 Service Status:"
        docker-compose -f docker-compose.prod.yml ps
        echo ""
        echo "🌐 Services available at:"
        echo "   API: http://localhost:3000"
        echo "   Worker: http://localhost:3001"
    else
        echo "❌ Migration failed! Please check the logs."
        docker-compose -f docker-compose.prod.yml logs migration
        exit 1
    fi
}

# Function to deploy without migrations (for updates)
deploy_without_migrations() {
    echo "📦 Deploying services without migrations..."
    
    # Build all services
    docker-compose -f docker-compose.prod.yml build
    
    # Start all services (migration will be skipped if already applied)
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "📊 Service Status:"
    docker-compose -f docker-compose.prod.yml ps
}

# Function to show status
show_status() {
    echo "📊 Production Service Status:"
    docker-compose -f docker-compose.prod.yml ps
}

# Function to show logs
show_logs() {
    echo "📋 Production Service Logs:"
    docker-compose -f docker-compose.prod.yml logs -f
}

# Function to stop services
stop_services() {
    echo "🛑 Stopping production services..."
    docker-compose -f docker-compose.prod.yml down
    echo "✅ Production services stopped!"
}

# Function to reset everything
reset_production() {
    echo "🗑️  Resetting production environment..."
    docker-compose -f docker-compose.prod.yml down -v
    echo "✅ Production environment reset!"
}

# Main script logic
case "$1" in
    "deploy")
        deploy_with_migrations
        ;;
    "update")
        deploy_without_migrations
        ;;
    "stop")
        stop_services
        ;;
    "reset")
        reset_production
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    *)
        echo "Usage: $0 {deploy|update|stop|reset|status|logs}"
        echo ""
        echo "Commands:"
        echo "  deploy  - Full deployment with migrations (first time)"
        echo "  update  - Deploy without migrations (for code updates)"
        echo "  stop    - Stop all production services"
        echo "  reset   - Reset production environment (removes volumes)"
        echo "  status  - Show service status"
        echo "  logs    - Show service logs"
        echo ""
        echo "Note: Make sure to set up your .env file before deploying!"
        exit 1
        ;;
esac 