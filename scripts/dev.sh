#!/bin/bash

# Development Environment Management Script

set -e

echo "🚀 Smart News Aggregator - Development Setup"

# Function to start infrastructure services
start_infrastructure() {
    echo "📦 Starting PostgreSQL and Redis..."
    docker-compose -f docker-compose.dev.yml up -d
    
    echo "⏳ Waiting for services to be ready..."
    sleep 10
    
    echo "✅ Infrastructure services started!"
    echo "   PostgreSQL: localhost:5432"
    echo "   Redis: localhost:6379"
}

# Function to stop infrastructure services
stop_infrastructure() {
    echo "🛑 Stopping infrastructure services..."
    docker-compose -f docker-compose.dev.yml down
    echo "✅ Infrastructure services stopped!"
}

# Function to reset data
reset_data() {
    echo "🗑️  Resetting all data..."
    docker-compose -f docker-compose.dev.yml down -v
    docker-compose -f docker-compose.dev.yml up -d
    echo "✅ Data reset complete!"
}

# Function to show status
show_status() {
    echo "📊 Service Status:"
    docker-compose -f docker-compose.dev.yml ps
}

# Function to show logs
show_logs() {
    echo "📋 Service Logs:"
    docker-compose -f docker-compose.dev.yml logs -f
}

# Main script logic
case "$1" in
    "start")
        start_infrastructure
        ;;
    "stop")
        stop_infrastructure
        ;;
    "reset")
        reset_data
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    *)
        echo "Usage: $0 {start|stop|reset|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start PostgreSQL and Redis"
        echo "  stop    - Stop infrastructure services"
        echo "  reset   - Reset all data (removes volumes)"
        echo "  status  - Show service status"
        echo "  logs    - Show service logs"
        exit 1
        ;;
esac 