#!/bin/bash

# 🌐 Railway Domain Setup Script for Bookiji
# This script helps configure custom domains for your Railway deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Railway CLI is installed
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI is not installed. Please install it first:"
        echo "npm install -g @railway/cli"
        exit 1
    fi
    print_success "Railway CLI is installed"
}

# Check if user is logged in to Railway
check_railway_auth() {
    if ! railway whoami &> /dev/null; then
        print_error "You are not logged in to Railway. Please login first:"
        echo "railway login"
        exit 1
    fi
    print_success "Logged in to Railway as $(railway whoami)"
}

# Get current Railway project status
get_railway_status() {
    print_status "Checking Railway project status..."
    
    if ! railway status &> /dev/null; then
        print_error "No Railway project linked. Please link your project first:"
        echo "railway link"
        exit 1
    fi
    
    print_success "Railway project is linked"
}

# List current domains
list_domains() {
    print_status "Current Railway domains:"
    railway domain list || print_warning "No domains configured yet"
}

# Add custom domain
add_custom_domain() {
    local domain=$1
    
    if [ -z "$domain" ]; then
        read -p "Enter your custom domain (e.g., www.yourdomain.com): " domain
    fi
    
    if [ -z "$domain" ]; then
        print_error "Domain is required"
        exit 1
    fi
    
    print_status "Adding domain: $domain"
    
    if railway domain add "$domain"; then
        print_success "Domain $domain added successfully"
    else
        print_error "Failed to add domain $domain"
        exit 1
    fi
}

# Update environment variables for custom domain
update_env_vars() {
    local domain=$1
    
    if [ -z "$domain" ]; then
        read -p "Enter your custom domain (e.g., www.yourdomain.com): " domain
    fi
    
    if [ -z "$domain" ]; then
        print_error "Domain is required"
        exit 1
    fi
    
    print_status "Updating environment variables for domain: $domain"
    
    # Update frontend service variables
    railway variables set "NEXT_PUBLIC_APP_URL=https://$domain" --service bookiji-frontend
    railway variables set "NEXTAUTH_URL=https://$domain" --service bookiji-frontend
    
    print_success "Environment variables updated"
}

# Check domain status
check_domain_status() {
    local domain=$1
    
    if [ -z "$domain" ]; then
        read -p "Enter your domain to check: " domain
    fi
    
    if [ -z "$domain" ]; then
        print_error "Domain is required"
        exit 1
    fi
    
    print_status "Checking domain status: $domain"
    
    # Check Railway domain status
    railway domain list | grep "$domain" || print_warning "Domain not found in Railway"
    
    # Check DNS propagation
    print_status "Checking DNS propagation..."
    if command -v nslookup &> /dev/null; then
        nslookup "$domain" || print_warning "DNS lookup failed"
    fi
    
    # Check HTTPS
    print_status "Checking HTTPS availability..."
    if curl -I "https://$domain" &> /dev/null; then
        print_success "HTTPS is working for $domain"
    else
        print_warning "HTTPS not available yet (this is normal during setup)"
    fi
}

# Show DNS configuration instructions
show_dns_instructions() {
    local domain=$1
    
    if [ -z "$domain" ]; then
        read -p "Enter your domain: " domain
    fi
    
    if [ -z "$domain" ]; then
        print_error "Domain is required"
        exit 1
    fi
    
    # Extract root domain
    root_domain=$(echo "$domain" | sed 's/^www\.//')
    
    print_status "DNS Configuration Instructions for GoDaddy:"
    echo ""
    echo "1. Login to GoDaddy and go to DNS Management for $root_domain"
    echo "2. Add the following CNAME record:"
    echo ""
    echo "   Type: CNAME"
    echo "   Name: www"
    echo "   Value: bookiji-frontend.railway.app"
    echo "   TTL: 600"
    echo ""
    echo "3. If you want to use the root domain ($root_domain), also add:"
    echo ""
    echo "   Type: CNAME"
    echo "   Name: @"
    echo "   Value: bookiji-frontend.railway.app"
    echo "   TTL: 600"
    echo ""
    echo "4. Wait 24-48 hours for DNS propagation"
    echo ""
    print_warning "Make sure to disable any domain forwarding in GoDaddy"
}

# Main menu
show_menu() {
    echo ""
    echo "🌐 Railway Domain Configuration Menu"
    echo "=================================="
    echo "1. Check Railway status"
    echo "2. List current domains"
    echo "3. Add custom domain"
    echo "4. Update environment variables"
    echo "5. Check domain status"
    echo "6. Show DNS configuration instructions"
    echo "7. Run full setup (interactive)"
    echo "8. Exit"
    echo ""
}

# Full setup process
run_full_setup() {
    print_status "Starting full domain setup process..."
    
    # Check prerequisites
    check_railway_cli
    check_railway_auth
    get_railway_status
    
    # Get domain from user
    read -p "Enter your custom domain (e.g., www.yourdomain.com): " domain
    
    if [ -z "$domain" ]; then
        print_error "Domain is required"
        exit 1
    fi
    
    # Add domain
    add_custom_domain "$domain"
    
    # Update environment variables
    update_env_vars "$domain"
    
    # Show DNS instructions
    show_dns_instructions "$domain"
    
    print_success "Setup complete! Follow the DNS instructions above."
    print_warning "Remember: DNS changes can take 24-48 hours to propagate."
}

# Main script logic
main() {
    echo "🌐 Railway Domain Setup Script for Bookiji"
    echo "=========================================="
    
    # Check if domain is provided as argument
    if [ $# -eq 1 ]; then
        case "$1" in
            "add")
                add_custom_domain
                ;;
            "check")
                check_domain_status
                ;;
            "dns")
                show_dns_instructions
                ;;
            "setup")
                run_full_setup
                ;;
            *)
                print_error "Unknown command: $1"
                echo "Usage: $0 [add|check|dns|setup]"
                exit 1
                ;;
        esac
        exit 0
    fi
    
    # Interactive menu
    while true; do
        show_menu
        read -p "Select an option (1-8): " choice
        
        case $choice in
            1)
                check_railway_cli
                check_railway_auth
                get_railway_status
                ;;
            2)
                list_domains
                ;;
            3)
                add_custom_domain
                ;;
            4)
                update_env_vars
                ;;
            5)
                check_domain_status
                ;;
            6)
                show_dns_instructions
                ;;
            7)
                run_full_setup
                ;;
            8)
                print_success "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please select 1-8."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
    done
}

# Run main function
main "$@" 