#!/bin/bash
# Log viewer script for Specra Docs
# View logs from different services

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
    echo -e "${BLUE}Specra Docs - Log Viewer${NC}"
    echo ""
    echo "Usage: ./logs.sh [service] [options]"
    echo ""
    echo "Services:"
    echo "  app      - Next.js application logs"
    echo "  db       - PostgreSQL database logs"
    echo "  caddy    - Caddy web server logs"
    echo "  all      - All container logs"
    echo ""
    echo "Options:"
    echo "  -f, --follow    Follow log output (live)"
    echo "  -n, --lines N   Show last N lines (default: 100)"
    echo ""
    echo "Examples:"
    echo "  ./logs.sh app              # Show last 100 lines of app logs"
    echo "  ./logs.sh app -f           # Follow app logs live"
    echo "  ./logs.sh app -n 50        # Show last 50 lines"
    echo "  ./logs.sh caddy --follow   # Follow Caddy logs"
}

# Default values
SERVICE="${1:-app}"
FOLLOW=false
LINES=100

# Parse arguments
shift
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -n|--lines)
            LINES="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

case $SERVICE in
    app)
        echo -e "${YELLOW}📱 Application Logs${NC}"
        if [ "$FOLLOW" = true ]; then
            docker-compose logs -f app
        else
            docker-compose logs --tail=$LINES app
        fi
        ;;
    db)
        echo -e "${YELLOW}🗄️  Database Logs${NC}"
        if [ "$FOLLOW" = true ]; then
            docker-compose logs -f db
        else
            docker-compose logs --tail=$LINES db
        fi
        ;;
    caddy)
        echo -e "${YELLOW}🌐 Caddy Logs${NC}"
        if [ "$FOLLOW" = true ]; then
            sudo journalctl -u caddy -f
        else
            sudo journalctl -u caddy -n $LINES
        fi
        ;;
    all)
        echo -e "${YELLOW}📋 All Container Logs${NC}"
        if [ "$FOLLOW" = true ]; then
            docker-compose logs -f
        else
            docker-compose logs --tail=$LINES
        fi
        ;;
    *)
        echo -e "${RED}Unknown service: $SERVICE${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
