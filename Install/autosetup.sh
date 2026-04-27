#!/bin/bash

# =======================================================
# WEBBY - Fully Automated Ubuntu 24.04 VPS Setup
# =======================================================
# This script provides complete automation for:
# - PHP 8.4 with all required extensions
# - MySQL 8.0 installation and configuration
# - Nginx with PHP-FPM
# - Node.js 20 LTS for frontend build
# - Laravel application deployment with npm build
# - Let's Encrypt SSL certificate
# =======================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Logging configuration
INSTALL_LOG="/home/install.log"
LOG_MAX_SIZE=10485760  # 10MB

# State management for resumable installation
STATE_FILE="/home/.webby_install_state"
CREDENTIALS_FILE="/home/.webby_credentials"

# Initialize state variables
declare -A COMPLETED_STEPS

# Configuration variables
APP_NAME="Webby"
WEBBY_DIR="/home/webby"
BUILDER_DIR="/home/webby-builder"
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="webby"
DOMAIN=""
SITE_URL=""
ADMIN_EMAIL=""
BUILDER_PORT="8891"
REVERB_PORT="8892"
REVERB_SUBDOMAIN="echo"

# Auto-generated credentials
MYSQL_ROOT_PASSWORD=""
DB_USERNAME=""
DB_PASSWORD=""
ADMIN_PASSWORD=""
BUILDER_KEY=""

# Reverb credentials (auto-generated)
REVERB_APP_ID=""
REVERB_KEY=""
REVERB_SECRET=""

# Domain handling variables
CANONICAL_DOMAIN=""
WWW_DOMAIN=""
DOMAIN_TYPE=""
NEEDS_WWW_REDIRECT=false
WILDCARD_SSL_INSTALLED=false

# Initialize logging system
setup_logging() {
    # Rotate log if it exceeds max size BEFORE writing new headers
    if [[ -f "$INSTALL_LOG" ]] && [[ $(stat -c%s "$INSTALL_LOG" 2>/dev/null || stat -f%z "$INSTALL_LOG" 2>/dev/null || echo 0) -gt $LOG_MAX_SIZE ]]; then
        mv "$INSTALL_LOG" "${INSTALL_LOG}.old"
    fi

    echo "========================================" > "$INSTALL_LOG"
    echo "WEBBY INSTALLATION LOG" >> "$INSTALL_LOG"
    echo "Started: $(date)" >> "$INSTALL_LOG"
    echo "Script: $0" >> "$INSTALL_LOG"
    echo "Arguments: $*" >> "$INSTALL_LOG"
    echo "========================================" >> "$INSTALL_LOG"
    echo "" >> "$INSTALL_LOG"

    echo -e "${BLUE}[INFO]${NC} Logging system initialized - output will be saved to $INSTALL_LOG"
}

# Log functions with dual output (console + file)
log_info() {
    local msg="$1"
    echo -e "${BLUE}[INFO]${NC} $msg"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $msg" >> "$INSTALL_LOG"
}

log_success() {
    local msg="$1"
    echo -e "${GREEN}[SUCCESS]${NC} $msg"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $msg" >> "$INSTALL_LOG"
}

log_warning() {
    local msg="$1"
    echo -e "${YELLOW}[WARNING]${NC} $msg"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $msg" >> "$INSTALL_LOG"
}

log_error() {
    local msg="$1"
    echo -e "${RED}[ERROR]${NC} $msg"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $msg" >> "$INSTALL_LOG"
}

log_header() {
    echo -e "\n${CYAN}=================================${NC}"
    echo -e "${CYAN} $1 ${NC}"
    echo -e "${CYAN}=================================${NC}\n"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [HEADER] $1" >> "$INSTALL_LOG"
}

log_highlight() {
    echo -e "\n${MAGENTA}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${MAGENTA}  $1  ${NC}"
    echo -e "${MAGENTA}═══════════════════════════════════════════════════════════════════${NC}\n"
}

log_wait() {
    local msg="$1"
    echo -e "${YELLOW}[WAIT]${NC} $msg - ${CYAN}Please wait, this may take a few minutes...${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WAIT] $msg" >> "$INSTALL_LOG"
}

log_progress() {
    local msg="$1"
    echo -e "${BLUE}[PROGRESS]${NC} $msg"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [PROGRESS] $msg" >> "$INSTALL_LOG"
}

# Generate secure random password that satisfies MySQL validate_password (MEDIUM policy)
# Requires: length>=8, mixed case, number, special char
generate_password() {
    local length=${1:-16}
    local base
    base=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c "$((length - 2))")
    # Append a special char and digit to guarantee policy compliance
    echo "${base}@$(openssl rand -hex 1 | head -c 1)"
}

# Generate secure random string for usernames
generate_username() {
    echo "webby_$(openssl rand -hex 4)"
}

# Auto-generate all credentials
generate_credentials() {
    log_header "GENERATING SECURE CREDENTIALS"

    MYSQL_ROOT_PASSWORD=$(generate_password 20)
    DB_PASSWORD=$(generate_password 16)
    ADMIN_PASSWORD=$(generate_password 12)
    DB_USERNAME=$(generate_username)
    BUILDER_KEY=$(generate_password 32)

    # Generate Reverb credentials (alphanumeric only - no special chars that break WebSocket URLs)
    REVERB_APP_ID=$(openssl rand -hex 8)
    REVERB_KEY=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 32)
    REVERB_SECRET=$(openssl rand -base64 96 | tr -dc 'a-zA-Z0-9' | head -c 64)

    log_success "All credentials generated automatically"
    log_info "MySQL root password: 20 characters"
    log_info "Database password: 16 characters"
    log_info "Admin password: 12 characters"
    log_info "Database username: $DB_USERNAME"
    log_info "Builder key: 32 characters"
    log_info "Reverb App ID: $REVERB_APP_ID"
    log_info "Reverb Key: 32 characters"
    log_info "Reverb Secret: 64 characters"

    # Save credentials for resume capability
    save_credentials
}

# ===========================================
# State Management Functions (Resumable Setup)
# ===========================================

save_state() {
    echo "# Webby Installation State - $(date)" > "$STATE_FILE"
    echo "DOMAIN=$DOMAIN" >> "$STATE_FILE"
    echo "CANONICAL_DOMAIN=$CANONICAL_DOMAIN" >> "$STATE_FILE"
    echo "WWW_DOMAIN=$WWW_DOMAIN" >> "$STATE_FILE"
    echo "DOMAIN_TYPE=$DOMAIN_TYPE" >> "$STATE_FILE"
    echo "NEEDS_WWW_REDIRECT=$NEEDS_WWW_REDIRECT" >> "$STATE_FILE"
    echo "ADMIN_EMAIL=$ADMIN_EMAIL" >> "$STATE_FILE"
    echo "SITE_URL=$SITE_URL" >> "$STATE_FILE"
    echo "DB_NAME=$DB_NAME" >> "$STATE_FILE"
    echo "DB_USERNAME=$DB_USERNAME" >> "$STATE_FILE"

    # Save completed steps
    echo "" >> "$STATE_FILE"
    echo "# Completed steps" >> "$STATE_FILE"
    for step in "${!COMPLETED_STEPS[@]}"; do
        echo "STEP_$step=completed" >> "$STATE_FILE"
    done

    chmod 600 "$STATE_FILE"
}

load_state() {
    if [[ -f "$STATE_FILE" ]]; then
        # Read non-step variables
        source <(grep -v '^STEP_' "$STATE_FILE" | grep -v '^#')

        # Load completed steps
        while IFS='=' read -r key value; do
            if [[ "$key" == STEP_* ]]; then
                step_name="${key#STEP_}"
                COMPLETED_STEPS["$step_name"]="completed"
            fi
        done < "$STATE_FILE"
        return 0
    fi
    return 1
}

save_credentials() {
    echo "# Webby Credentials - $(date)" > "$CREDENTIALS_FILE"
    echo "MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD" >> "$CREDENTIALS_FILE"
    echo "DB_PASSWORD=$DB_PASSWORD" >> "$CREDENTIALS_FILE"
    echo "DB_USERNAME=$DB_USERNAME" >> "$CREDENTIALS_FILE"
    echo "ADMIN_PASSWORD=$ADMIN_PASSWORD" >> "$CREDENTIALS_FILE"
    echo "BUILDER_KEY=$BUILDER_KEY" >> "$CREDENTIALS_FILE"
    # Reverb credentials
    echo "REVERB_APP_ID=$REVERB_APP_ID" >> "$CREDENTIALS_FILE"
    echo "REVERB_KEY=$REVERB_KEY" >> "$CREDENTIALS_FILE"
    echo "REVERB_SECRET=$REVERB_SECRET" >> "$CREDENTIALS_FILE"
    chmod 600 "$CREDENTIALS_FILE"
}

load_credentials() {
    if [[ -f "$CREDENTIALS_FILE" ]]; then
        source "$CREDENTIALS_FILE"
        return 0
    fi
    return 1
}

mark_step_complete() {
    local step_name="$1"
    COMPLETED_STEPS["$step_name"]="completed"
    save_state
}

is_step_complete() {
    local step_name="$1"
    [[ "${COMPLETED_STEPS[$step_name]}" == "completed" ]]
}

run_step() {
    local step_name="$1"
    local step_function="$2"

    if is_step_complete "$step_name"; then
        log_info "Skipping completed step: $step_name"
        return 0
    fi

    log_header "STEP: $step_name"
    if $step_function; then
        mark_step_complete "$step_name"
        log_success "Completed: $step_name"
        return 0
    else
        log_error "Failed: $step_name"
        return 1
    fi
}

check_resume() {
    if load_state && load_credentials; then
        echo ""
        echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}PREVIOUS INSTALLATION DETECTED${NC}"
        echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${CYAN}Domain: $CANONICAL_DOMAIN${NC}"
        echo -e "${CYAN}Admin Email: $ADMIN_EMAIL${NC}"
        echo -e "${CYAN}Completed steps:${NC}"
        for step in "${!COMPLETED_STEPS[@]}"; do
            echo -e "  ${GREEN}✓${NC} $step"
        done
        echo ""
        echo -e "${YELLOW}Options:${NC}"
        echo -e "  1) Resume installation (Recommended)"
        echo -e "  2) Start fresh (removes previous progress)"
        echo ""
        echo -en "${CYAN}>>> Choose option [1]: ${NC}"
        read -r RESUME_OPTION

        if [[ "$RESUME_OPTION" == "2" ]]; then
            rm -f "$STATE_FILE" "$CREDENTIALS_FILE"
            unset COMPLETED_STEPS
            declare -gA COMPLETED_STEPS
            log_info "Starting fresh installation"
            return 1
        else
            log_info "Resuming installation from previous state"
            return 0
        fi
    fi
    return 1
}

cleanup_state_files() {
    rm -f "$STATE_FILE" "$CREDENTIALS_FILE"
    log_info "Installation state files cleaned up"
}

# ===========================================
# Domain Settings Configuration
# ===========================================

configure_domain_settings() {
    log_progress "Configuring domain features for VPS installation"

    # Check flag from install_wildcard_ssl(), with fallback cert check for resume scenarios
    local enable_subdomains="false"
    if [[ "$WILDCARD_SSL_INSTALLED" == "true" ]] || \
       certbot certificates 2>/dev/null | grep -q "\*\.$CANONICAL_DOMAIN"; then
        enable_subdomains="true"
        log_info "Wildcard SSL detected - enabling subdomain publishing"
    else
        log_info "No wildcard SSL - subdomain publishing will be disabled"
    fi

    cd "$WEBBY_DIR"
    php artisan tinker --execute="
        \App\Models\SystemSetting::set('domain_enable_subdomains', $enable_subdomains, 'boolean', 'domains');
        \App\Models\SystemSetting::set('domain_base_domain', '$CANONICAL_DOMAIN', 'string', 'domains');
        \App\Models\SystemSetting::set('domain_ssl_provider', 'letsencrypt', 'string', 'domains');
        \App\Models\SystemSetting::set('domain_verification_method', 'dns_cname', 'string', 'domains');
    " >/dev/null 2>&1

    if [[ $? -eq 0 ]]; then
        if [[ "$enable_subdomains" == "true" ]]; then
            log_success "Domain features enabled with subdomains on base domain: $CANONICAL_DOMAIN"
        else
            log_success "Domain features enabled (subdomains disabled - no wildcard SSL) on base domain: $CANONICAL_DOMAIN"
        fi
        return 0
    else
        log_warning "Could not configure domain settings - you can configure them later in Admin > Settings > Domains"
        return 0  # Non-fatal error
    fi
}

# ===========================================
# Wildcard SSL Certificate
# ===========================================

install_wildcard_ssl() {
    log_header "WILDCARD SSL FOR SUBDOMAINS"

    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}WILDCARD SSL OPTIONS${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}Wildcard certificates (*.${CANONICAL_DOMAIN}) enable subdomain publishing.${NC}"
    echo -e "${CYAN}This requires DNS-01 challenge verification.${NC}"
    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo -e "  1) Skip for now (configure later in Admin > Settings > Domains)"
    echo -e "  2) Manual DNS challenge (add TXT record when prompted)"
    echo ""
    echo -en "${CYAN}>>> Choose option [1]: ${NC}"
    read -r WILDCARD_OPTION

    if [[ "$WILDCARD_OPTION" == "2" ]]; then
        log_info "Starting manual DNS challenge for wildcard certificate..."
        log_warning "You will need to add a TXT record to your DNS when prompted"

        certbot certonly --manual --preferred-challenges=dns \
            -d "*.$CANONICAL_DOMAIN" \
            --agree-tos --email "$ADMIN_EMAIL" \
            --no-eff-email \
            --manual-public-ip-logging-ok

        # Determine which cert path was created (handles -0001, -0002, etc.)
        local WILDCARD_CERT_PATH=""
        WILDCARD_CERT_PATH=$(certbot certificates 2>/dev/null \
            | grep -A 3 "Domains:.*\*\.$CANONICAL_DOMAIN" \
            | grep "Certificate Path:" \
            | sed 's/.*Certificate Path: //' \
            | sed 's|/fullchain.pem||' \
            | head -1)

        # Fallback to filesystem check if certbot query fails
        if [[ -z "$WILDCARD_CERT_PATH" ]]; then
            for cert_dir in /etc/letsencrypt/live/${CANONICAL_DOMAIN}*/; do
                if [[ -f "${cert_dir}fullchain.pem" ]]; then
                    WILDCARD_CERT_PATH="${cert_dir%/}"
                fi
            done
        fi

        if [[ -n "$WILDCARD_CERT_PATH" ]]; then
            log_success "Wildcard SSL certificate installed"
            log_info "Subdomains will now have SSL enabled automatically"
            WILDCARD_SSL_INSTALLED=true

            # Add wildcard Nginx server block (skip if already present)
            log_progress "Adding wildcard subdomain Nginx configuration..."
            local NGINX_CONF="/etc/nginx/sites-available/$CANONICAL_DOMAIN"
            if grep -q "Wildcard Subdomain Server Block" "$NGINX_CONF" 2>/dev/null; then
                log_info "Wildcard Nginx block already exists - skipping"
            else
            cat >> "$NGINX_CONF" <<WILDCARD_NGINX

# Wildcard Subdomain Server Block (published projects + reserved subdomains)
server {
    listen 443 ssl;
    server_name *.$CANONICAL_DOMAIN;

    ssl_certificate $WILDCARD_CERT_PATH/fullchain.pem;
    ssl_certificate_key $WILDCARD_CERT_PATH/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root $WEBBY_DIR/public;
    index index.php index.html;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 100M;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php\$ {
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
        fastcgi_buffers 16 16k;
        fastcgi_buffer_size 32k;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|zip)\$ {
        try_files \$uri /index.php?\$query_string;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    location ~ \.(env|log|bak|config|sql|fla|psd|ini|sh|inc|swp|dist)\$ {
        deny all;
        return 404;
    }
}

# Wildcard HTTP to HTTPS redirect
server {
    listen 80;
    server_name *.$CANONICAL_DOMAIN;
    return 301 https://\$host\$request_uri;
}
WILDCARD_NGINX

            fi # end of duplicate-check else

            # Test and reload Nginx
            if nginx -t >/dev/null 2>&1; then
                systemctl reload nginx
                log_success "Wildcard subdomain Nginx configuration applied"
            else
                log_warning "Nginx config test failed after adding wildcard block - check manually"
            fi
        else
            log_warning "Wildcard certificate not installed - subdomain SSL will need manual setup"
        fi
    else
        log_info "Skipping wildcard SSL - can be configured later"
        log_info "To enable later, run: certbot certonly --manual --preferred-challenges=dns -d '*.$CANONICAL_DOMAIN'"
    fi

    return 0  # Non-fatal, always return success
}

# Validate and process domain input
validate_and_process_domain() {
    local input_domain="$1"

    input_domain=$(echo "$input_domain" | sed 's|^https\?://||' | sed 's|/.*||' | tr '[:upper:]' '[:lower:]')

    if [[ -z "$input_domain" ]]; then
        log_error "Domain name cannot be empty"
        return 1
    fi

    if [[ "$input_domain" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]] ||
       [[ "$input_domain" =~ ^[0-9a-fA-F:]+:[0-9a-fA-F:]*$ ]]; then
        log_error "IP addresses are not allowed as domain names"
        log_info "SSL certificates require proper domain names, not IP addresses"
        log_info "Please use a domain name like: example.com or subdomain.example.com"
        return 1
    fi

    if [[ ! "$input_domain" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$ ]]; then
        log_error "Invalid domain format: $input_domain"
        log_info "Domain must be a valid format like: example.com or subdomain.example.com"
        return 1
    fi

    local dot_count=$(echo "$input_domain" | tr -cd '.' | wc -c)

    if [[ "$input_domain" =~ ^www\. ]]; then
        DOMAIN_TYPE="www_input"
        CANONICAL_DOMAIN="${input_domain#www.}"
        WWW_DOMAIN="$input_domain"
        NEEDS_WWW_REDIRECT=true
        log_info "WWW domain detected: $input_domain → canonical: $CANONICAL_DOMAIN"
    elif [[ $dot_count -eq 1 ]]; then
        DOMAIN_TYPE="root"
        CANONICAL_DOMAIN="$input_domain"
        WWW_DOMAIN="www.$input_domain"
        NEEDS_WWW_REDIRECT=true
        log_info "Root domain detected: $input_domain → will redirect www.$input_domain"
    else
        DOMAIN_TYPE="subdomain"
        CANONICAL_DOMAIN="$input_domain"
        WWW_DOMAIN=""
        NEEDS_WWW_REDIRECT=false
        log_info "Subdomain detected: $input_domain → no www redirect needed"
    fi

    DOMAIN="$CANONICAL_DOMAIN"
    return 0
}

# Get domain name from user
get_domain() {
    local input_domain

    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}                                    DOMAIN SETUP REQUIRED${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}${BOLD}USER INPUT REQUIRED - PLEASE PROVIDE YOUR DOMAIN NAME${NC}"
    echo ""
    echo -e "${YELLOW}Please enter your domain name for SSL certificate:${NC}"
    echo -e "${YELLOW}This will be used to generate your SSL certificate via Let's Encrypt${NC}"
    echo -e "${GREEN}Examples: ${CYAN}example.com${NC} or ${CYAN}subdomain.example.com${NC}"
    echo -e "${RED}Note: IP addresses are not allowed${NC}"
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    while true; do
        echo -en "${CYAN}${BOLD}>>> Enter your domain name: ${NC}"
        read input_domain

        if validate_and_process_domain "$input_domain"; then
            break
        else
            echo ""
            log_warning "Please try again with a valid domain name"
            echo ""
        fi
    done

    SITE_URL="https://${CANONICAL_DOMAIN}"
    ADMIN_EMAIL="admin@${CANONICAL_DOMAIN}"

    echo ""
    log_success "Domain configuration:"
    log_info "  Primary URL: $SITE_URL"
    log_info "  Admin email: $ADMIN_EMAIL"
    if [[ "$NEEDS_WWW_REDIRECT" == "true" ]]; then
        log_info "  WWW redirect: https://$WWW_DOMAIN → https://$CANONICAL_DOMAIN"
    fi
    echo ""
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        log_info "Please run: sudo ./autosetup.sh"
        exit 1
    fi
    log_info "Running as root user"
}

# Check available disk space
check_disk_space() {
    local required_gb=${1:-10}
    local available_kb=$(df / | awk 'NR==2 {print $4}')
    local available_gb=$((available_kb / 1024 / 1024))

    if [[ $available_gb -lt $required_gb ]]; then
        log_error "Insufficient disk space!"
        log_error "Required: ${required_gb}GB, Available: ${available_gb}GB"
        log_info "Please free up space or use a larger disk."
        exit 1
    fi
    log_success "Disk space check passed: ${available_gb}GB available"
}

# Organize files from CodeCanyon ZIP structure
organize_uploaded_files() {
    log_header "ORGANIZING UPLOADED FILES"

    # Detect script location
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    log_info "Script running from: $SCRIPT_DIR"

    # Check if running from /home/Install/ (CodeCanyon ZIP structure)
    if [[ "$SCRIPT_DIR" == "/home/Install" ]]; then
        log_info "Detected CodeCanyon ZIP structure in /home/"

        # Check if Laravel files are directly in /home/Install/ (artisan exists here)
        if [[ -f "/home/Install/artisan" ]] && [[ ! -d "$WEBBY_DIR" ]]; then
            log_progress "Moving Laravel app to $WEBBY_DIR..."
            mkdir -p "$WEBBY_DIR"
            # Move everything except the script itself
            for item in /home/Install/*; do
                if [[ "$(basename "$item")" != "autosetup.sh" ]]; then
                    mv "$item" "$WEBBY_DIR/"
                fi
            done
            # Also move hidden files like .env.example
            for item in /home/Install/.*; do
                if [[ "$(basename "$item")" != "." ]] && [[ "$(basename "$item")" != ".." ]]; then
                    mv "$item" "$WEBBY_DIR/" 2>/dev/null || true
                fi
            done
            log_success "Laravel app moved to $WEBBY_DIR"
        # Fallback: Check if webby/ subfolder exists (old structure)
        elif [[ -d "/home/Install/webby" ]] && [[ ! -d "$WEBBY_DIR" ]]; then
            log_progress "Moving Laravel app to $WEBBY_DIR..."
            mv /home/Install/webby "$WEBBY_DIR"
            log_success "Laravel app moved to $WEBBY_DIR"
        fi

        # Move Builder/prebuilt/ contents to /home/webby-builder/
        if [[ -d "/home/Builder/prebuilt" ]] && [[ ! -d "$BUILDER_DIR" ]]; then
            log_progress "Moving Builder to $BUILDER_DIR..."
            mv /home/Builder/prebuilt "$BUILDER_DIR"
            log_success "Builder moved to $BUILDER_DIR"
        fi
    else
        log_info "Files expected to be pre-organized in $WEBBY_DIR and $BUILDER_DIR"
    fi
}

# Verify uploaded files
verify_upload_structure() {
    log_header "VERIFYING UPLOADED FILES"

    if [[ ! -d "$WEBBY_DIR" ]] || [[ ! -f "$WEBBY_DIR/artisan" ]]; then
        log_error "Laravel application not found at $WEBBY_DIR"
        echo ""
        echo -e "${YELLOW}Please upload the CodeCanyon ZIP contents to /home/ via SFTP${NC}"
        echo -e "${CYAN}Expected structure after upload:${NC}"
        echo -e "  /home/"
        echo -e "    ├── Documentation/"
        echo -e "    ├── Install/"
        echo -e "    │   ├── app/"
        echo -e "    │   ├── config/"
        echo -e "    │   ├── artisan"
        echo -e "    │   ├── package.json"
        echo -e "    │   ├── autosetup.sh"
        echo -e "    │   └── ..."
        echo -e "    └── Builder/"
        echo -e "        └── prebuilt/"
        echo -e "            └── webby-builder-linux"
        echo ""
        echo -e "${CYAN}Then run: ${GREEN}bash /home/Install/autosetup.sh${NC}"
        exit 1
    fi

    if [[ ! -d "$BUILDER_DIR" ]] || [[ ! -f "$BUILDER_DIR/webby-builder-linux" ]]; then
        log_error "Builder server not found at $BUILDER_DIR"
        echo ""
        echo -e "${YELLOW}Please ensure Builder/prebuilt/ folder exists in /home/${NC}"
        echo -e "${CYAN}Expected: /home/Builder/prebuilt/webby-builder-linux${NC}"
        exit 1
    fi

    log_success "All required files found"
    log_info "  Laravel app: $WEBBY_DIR"
    log_info "  Builder: $BUILDER_DIR"
}

# Update system packages
update_system() {
    log_header "UPDATING SYSTEM PACKAGES"

    log_wait "Updating package repositories"
    export DEBIAN_FRONTEND=noninteractive
    apt update -y >/dev/null 2>&1

    log_wait "Upgrading system packages"
    apt upgrade -y >/dev/null 2>&1

    log_wait "Installing essential packages"
    apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates git openssl unzip zip >/dev/null 2>&1

    log_success "System packages updated successfully"
}

# Install PHP 8.4
install_php() {
    log_header "INSTALLING PHP 8.4"

    log_wait "Adding PHP repository"
    add-apt-repository ppa:ondrej/php -y >/dev/null 2>&1
    apt update >/dev/null 2>&1

    log_wait "Installing PHP 8.4 and extensions"
    apt install -y \
        php8.4-fpm \
        php8.4-cli \
        php8.4-common \
        php8.4-bcmath \
        php8.4-curl \
        php8.4-dom \
        php8.4-fileinfo \
        php8.4-gd \
        php8.4-mbstring \
        php8.4-mysql \
        php8.4-xml \
        php8.4-zip \
        php8.4-tokenizer \
        php8.4-opcache \
        php8.4-intl >/dev/null 2>&1

    log_progress "Configuring PHP-FPM for production"
    PHP_INI="/etc/php/8.4/fpm/php.ini"
    sed -i 's/upload_max_filesize = .*/upload_max_filesize = 100M/' $PHP_INI
    sed -i 's/post_max_size = .*/post_max_size = 100M/' $PHP_INI
    sed -i 's/memory_limit = .*/memory_limit = 256M/' $PHP_INI
    sed -i 's/max_execution_time = .*/max_execution_time = 120/' $PHP_INI

    systemctl restart php8.4-fpm
    systemctl enable php8.4-fpm

    PHP_VERSION=$(php -v | head -n 1)
    log_success "PHP installed: $PHP_VERSION"
}

# Install MySQL 8.0
install_mysql() {
    log_header "INSTALLING MYSQL 8.0"

    log_wait "Installing MySQL server and client"
    apt install -y mysql-server mysql-client >/dev/null 2>&1

    log_progress "Starting MySQL service"
    systemctl start mysql
    systemctl enable mysql

    log_wait "Securing MySQL installation"
    sleep 5

    # Lower validate_password policy if the plugin is active (common on Ubuntu 24.04)
    mysql -e "SET GLOBAL validate_password.policy=LOW;" 2>/dev/null || true
    mysql -e "SET GLOBAL validate_password.special_char_count=0;" 2>/dev/null || true
    mysql -e "SET GLOBAL validate_password.mixed_case_count=0;" 2>/dev/null || true

    # Set root password (try without password first for fresh installs, then with password for existing)
    if ! mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASSWORD';" 2>/dev/null; then
        log_error "Failed to set MySQL root password"
        exit 1
    fi

    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='';"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS test;"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;"

    log_success "MySQL 8.0 installed and secured"
}

# Create database and user
create_database() {
    log_header "CREATING WEBBY DATABASE"

    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE USER IF NOT EXISTS '$DB_USERNAME'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USERNAME'@'localhost';"
    mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;"

    if mysql -u "$DB_USERNAME" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 1;" >/dev/null 2>&1; then
        log_success "Database '$DB_NAME' created successfully"
        log_success "User '$DB_USERNAME' created with full privileges"
    else
        log_error "Failed to create database or user"
        exit 1
    fi
}

# Install Nginx
install_nginx() {
    log_header "INSTALLING NGINX"

    log_wait "Installing Nginx web server"
    apt install -y nginx >/dev/null 2>&1

    systemctl start nginx
    systemctl enable nginx

    # Create Nginx configuration for Laravel
    if [[ "$NEEDS_WWW_REDIRECT" == "true" ]]; then
        cat > "/etc/nginx/sites-available/$CANONICAL_DOMAIN" <<EOF
# WWW to Non-WWW Redirect
server {
    listen 80;
    server_name $WWW_DOMAIN;
    return 301 https://$CANONICAL_DOMAIN\$request_uri;
}

# Main Laravel Application
server {
    listen 80;
    server_name $CANONICAL_DOMAIN;
    root $WEBBY_DIR/public;
    index index.php index.html;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 100M;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php\$ {
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
        fastcgi_buffers 16 16k;
        fastcgi_buffer_size 32k;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|zip)\$ {
        try_files \$uri /index.php?\$query_string;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    location ~ \.(env|log|bak|config|sql|fla|psd|ini|sh|inc|swp|dist)\$ {
        deny all;
        return 404;
    }

    location /adminer {
        alias /var/www/html/adminer.php;
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_index adminer.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www/html/adminer.php;
    }
}
EOF
    else
        cat > "/etc/nginx/sites-available/$CANONICAL_DOMAIN" <<EOF
server {
    listen 80;
    server_name $CANONICAL_DOMAIN;
    root $WEBBY_DIR/public;
    index index.php index.html;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 100M;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location ~ \.php\$ {
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
        fastcgi_buffers 16 16k;
        fastcgi_buffer_size 32k;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|zip)\$ {
        try_files \$uri /index.php?\$query_string;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    location ~ \.(env|log|bak|config|sql|fla|psd|ini|sh|inc|swp|dist)\$ {
        deny all;
        return 404;
    }

    location /adminer {
        alias /var/www/html/adminer.php;
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_index adminer.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www/html/adminer.php;
    }
}
EOF
    fi

    ln -sf "/etc/nginx/sites-available/$CANONICAL_DOMAIN" /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default

    # Create Reverb WebSocket proxy config
    log_progress "Creating Nginx configuration for Reverb WebSocket server"
    cat > "/etc/nginx/sites-available/$REVERB_SUBDOMAIN.$CANONICAL_DOMAIN" <<EOF
# Reverb WebSocket Proxy
server {
    listen 80;
    server_name $REVERB_SUBDOMAIN.$CANONICAL_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$REVERB_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
}
EOF

    ln -sf "/etc/nginx/sites-available/$REVERB_SUBDOMAIN.$CANONICAL_DOMAIN" /etc/nginx/sites-enabled/

    log_progress "Testing Nginx configuration"
    if ! nginx -t 2>/dev/null; then
        log_error "Nginx configuration test failed"
        nginx -t
        exit 1
    fi
    systemctl reload nginx

    log_success "Nginx installed and configured for $CANONICAL_DOMAIN"
}

# Install SSL certificate
install_ssl() {
    log_header "INSTALLING SSL CERTIFICATE"

    apt install -y certbot python3-certbot-nginx >/dev/null 2>&1

    SERVER_IP=$(curl -s -4 --max-time 5 ifconfig.me 2>/dev/null || curl -s -4 --max-time 5 ipecho.net/plain 2>/dev/null || curl -s -4 --max-time 5 icanhazip.com 2>/dev/null || echo "Unable to detect IP")

    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}                                    DNS CONFIGURATION REQUIRED${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${CYAN}${BOLD}USER ACTION REQUIRED - CONFIGURE DNS BEFORE CONTINUING${NC}"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Configure ALL required DNS records before proceeding!${NC}"
    echo ""
    echo -e "${GREEN}Required DNS Records:${NC}"
    echo -e "  ${CYAN}Type${NC}  | ${CYAN}Host${NC}           | ${CYAN}Value${NC}"
    echo -e "  ─────────────────────────────────────────────"
    echo -e "  A     | @              | $SERVER_IP"
    echo -e "  A     | www            | $SERVER_IP"
    echo -e "  A     | $REVERB_SUBDOMAIN            | $SERVER_IP"
    echo -e "  A     | *              | $SERVER_IP"
    echo ""
    echo -e "${YELLOW}Purpose:${NC}"
    echo -e "  • ${CYAN}@${NC} - Main domain ($CANONICAL_DOMAIN)"
    echo -e "  • ${CYAN}www${NC} - WWW redirect (www.$CANONICAL_DOMAIN)"
    echo -e "  • ${CYAN}$REVERB_SUBDOMAIN${NC} - WebSocket server ($REVERB_SUBDOMAIN.$CANONICAL_DOMAIN)"
    echo -e "  • ${CYAN}*${NC} - Wildcard for subdomain publishing"
    echo ""
    echo -e "${YELLOW}You can verify DNS propagation with:${NC}"
    echo -e "  • Online tool: ${CYAN}https://dnschecker.org${NC}"
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -en "${CYAN}${BOLD}>>> Press Enter when DNS is configured and ready: ${NC}"
    read

    log_info "Verifying domain resolution..."

    # Always include echo subdomain for Reverb WebSocket server
    REVERB_DOMAIN="$REVERB_SUBDOMAIN.$CANONICAL_DOMAIN"

    # Get SSL for main domain (certbot --nginx manages the main site config)
    if [[ "$NEEDS_WWW_REDIRECT" == "true" ]]; then
        log_info "Obtaining SSL certificate for $CANONICAL_DOMAIN and $WWW_DOMAIN..."
        if certbot --nginx -d "$CANONICAL_DOMAIN" -d "$WWW_DOMAIN" --non-interactive --agree-tos --email "$ADMIN_EMAIL" --redirect; then
            log_success "SSL certificate installed for main domain"
        else
            log_error "Failed to obtain SSL certificate for main domain"
            log_warning "Continuing without SSL - you can set it up manually later"
        fi
    else
        log_info "Obtaining SSL certificate for $CANONICAL_DOMAIN..."
        if certbot --nginx -d "$CANONICAL_DOMAIN" --non-interactive --agree-tos --email "$ADMIN_EMAIL" --redirect; then
            log_success "SSL certificate installed for $CANONICAL_DOMAIN"
        else
            log_error "Failed to obtain SSL certificate"
            log_warning "Continuing without SSL - you can set it up manually later"
        fi
    fi

    # Get SSL for Reverb subdomain separately using --certonly to avoid mangling the proxy config
    # certbot --nginx rewrites server blocks and breaks WebSocket proxy directives
    log_info "Obtaining SSL certificate for $REVERB_DOMAIN..."
    if certbot certonly --nginx -d "$REVERB_DOMAIN" --non-interactive --agree-tos --email "$ADMIN_EMAIL"; then
        log_success "SSL certificate obtained for $REVERB_DOMAIN"

        # Determine the cert path for the Reverb subdomain
        local REVERB_CERT_PATH=""
        REVERB_CERT_PATH=$(certbot certificates 2>/dev/null \
            | grep -B 1 "Domains:.*$REVERB_DOMAIN" \
            | grep "Certificate Name:" \
            | sed 's/.*Certificate Name: //' \
            | head -1)

        if [[ -n "$REVERB_CERT_PATH" ]]; then
            local CERT_DIR="/etc/letsencrypt/live/$REVERB_CERT_PATH"
        else
            # Fallback: use the main domain cert (which may cover the subdomain)
            local CERT_DIR="/etc/letsencrypt/live/$CANONICAL_DOMAIN"
            for d in /etc/letsencrypt/live/${CANONICAL_DOMAIN}*/; do
                if [[ -f "${d}fullchain.pem" ]]; then
                    CERT_DIR="${d%/}"
                fi
            done
        fi

        # Rewrite the Reverb Nginx config with SSL proxy (certbot --nginx would break it)
        log_progress "Configuring SSL for Reverb WebSocket proxy..."
        cat > "/etc/nginx/sites-available/$REVERB_DOMAIN" <<REVERB_SSL_EOF
# Reverb WebSocket Proxy (SSL)
server {
    listen 443 ssl;
    server_name $REVERB_DOMAIN;

    ssl_certificate $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:$REVERB_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
}

server {
    listen 80;
    server_name $REVERB_DOMAIN;
    return 301 https://\$host\$request_uri;
}
REVERB_SSL_EOF

        if nginx -t >/dev/null 2>&1; then
            systemctl reload nginx
            log_success "Reverb WebSocket proxy configured with SSL"
        else
            log_warning "Nginx config test failed after Reverb SSL setup - check manually"
        fi
    else
        log_warning "Failed to obtain SSL for $REVERB_DOMAIN - WebSocket will use existing config"
    fi

    systemctl enable certbot.timer
    systemctl start certbot.timer

    log_success "SSL setup completed"
}

# Setup custom domain SSL provisioning support
setup_custom_domain_support() {
    log_header "SETTING UP CUSTOM DOMAIN SUPPORT"

    log_info "Configuring sudoers for SSL provisioning..."

    # Allow www-data to run certbot and nginx commands for SSL provisioning
    cat > /etc/sudoers.d/webby-ssl <<EOF
# Webby custom domain SSL provisioning
# This allows the PHP process (www-data) to provision SSL certificates
# and configure nginx for custom domains
www-data ALL=(ALL) NOPASSWD: /usr/bin/certbot
www-data ALL=(ALL) NOPASSWD: /usr/sbin/nginx
www-data ALL=(ALL) NOPASSWD: /bin/ln -sf /etc/nginx/sites-available/webby-* /etc/nginx/sites-enabled/
www-data ALL=(ALL) NOPASSWD: /bin/mv /tmp/webby-*.conf /etc/nginx/sites-available/
www-data ALL=(ALL) NOPASSWD: /bin/rm /etc/nginx/sites-available/webby-*
www-data ALL=(ALL) NOPASSWD: /bin/rm /etc/nginx/sites-enabled/webby-*
EOF

    chmod 440 /etc/sudoers.d/webby-ssl

    log_success "Custom domain SSL provisioning support configured"
}

# Install Adminer database manager
install_adminer() {
    log_header "INSTALLING ADMINER DATABASE MANAGER"

    log_wait "Downloading Adminer"
    curl -sL https://github.com/vrana/adminer/releases/download/v5.4.1/adminer-5.4.1-mysql-en.php -o /var/www/html/adminer.php

    chown www-data:www-data /var/www/html/adminer.php
    chmod 644 /var/www/html/adminer.php

    log_success "Adminer installed - access at http://$CANONICAL_DOMAIN/adminer"
}

# Install Node.js
install_nodejs() {
    log_header "INSTALLING NODE.JS 20 LTS"

    log_wait "Adding NodeSource repository"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1

    log_wait "Installing Node.js"
    apt install -y nodejs >/dev/null 2>&1

    log_wait "Installing PM2 process manager"
    npm install -g pm2 >/dev/null 2>&1

    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)

    log_success "Node.js installed: $NODE_VERSION"
    log_success "npm installed: $NPM_VERSION"
    log_success "PM2 installed globally"
}

# Setup Laravel application
setup_laravel() {
    log_header "SETTING UP LARAVEL APPLICATION"

    cd $WEBBY_DIR || { log_error "Failed to enter $WEBBY_DIR"; exit 1; }

    log_progress "Creating .env configuration file"
    cat > $WEBBY_DIR/.env <<EOF
APP_NAME="$APP_NAME"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_TIMEZONE=UTC
APP_URL=$SITE_URL

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_DATABASE=$DB_NAME
DB_USERNAME=$DB_USERNAME
DB_PASSWORD=$DB_PASSWORD

SESSION_DRIVER=file
SESSION_LIFETIME=120
QUEUE_CONNECTION=sync

CACHE_STORE=file
FILESYSTEM_DISK=local

VITE_APP_NAME="\${APP_NAME}"
EOF

    log_progress "Installing Composer"
    if ! command -v composer &>/dev/null; then
        curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer >/dev/null 2>&1
        log_success "Composer installed globally"
    fi

    log_progress "Installing Composer dependencies"
    log_wait "Running composer install"
    composer install --no-dev --optimize-autoloader --no-interaction >/dev/null 2>&1

    if [[ -d "$WEBBY_DIR/public/build" ]]; then
        log_success "Pre-built frontend assets found - skipping build step"
    else
        log_error "Frontend assets not found at $WEBBY_DIR/public/build"
        log_info "The release package should include pre-built assets"
        exit 1
    fi

    log_progress "Setting file permissions"
    chown -R www-data:www-data $WEBBY_DIR
    find $WEBBY_DIR -type d -exec chmod 755 {} \;
    find $WEBBY_DIR -type f -exec chmod 644 {} \;
    chmod +x $WEBBY_DIR/artisan
    chmod -R 775 $WEBBY_DIR/storage
    chmod -R 775 $WEBBY_DIR/bootstrap/cache
    mkdir -p $WEBBY_DIR/storage/app/previews
    mkdir -p $WEBBY_DIR/storage/app/private/templates

    log_progress "Generating application key"
    php artisan key:generate --force

    log_progress "Clearing configuration cache"
    php artisan config:clear

    # Restart PHP-FPM to flush OPcache — prevents stale cached .env
    # (without this, FPM workers may serve the old empty APP_KEY for minutes)
    log_progress "Restarting PHP-FPM to flush OPcache"
    local PHP_SHORT
    PHP_SHORT=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
    systemctl restart "php${PHP_SHORT}-fpm" 2>/dev/null || true

    log_wait "Running database migrations"
    if ! php artisan migrate --force; then
        log_error "Database migration failed"
        exit 1
    fi

    log_wait "Running database seeders"
    php artisan db:seed --class=PlanSeeder --force
    php artisan db:seed --class=SystemSettingSeeder --force
    php artisan db:seed --class=PaymentGatewayPluginsSeeder --force
    php artisan db:seed --class=LanguageSeeder --force
    php artisan db:seed --class=LandingPageSeeder --force
    php artisan db:seed --class=TemplateSeeder --force

    log_progress "Creating admin user"
    if ! php artisan tinker --execute="
        \$plan = \App\Models\Plan::orderBy('price')->first();
        \$user = \App\Models\User::create([
            'name' => 'Administrator',
            'email' => '$ADMIN_EMAIL',
            'password' => bcrypt('$ADMIN_PASSWORD'),
            'role' => 'admin',
            'status' => 'active',
            'plan_id' => \$plan?->id,
            'build_credits' => \$plan?->monthly_build_credits ?? 10000,
        ]);
        \$user->email_verified_at = now();
        \$user->save();
    " >/dev/null 2>&1; then
        log_warning "Failed to create admin user - you may need to create one manually"
    fi

    # Optional: Ask for Envato purchase code
    echo ""
    echo -e "${CYAN}${BOLD}>>> Enter your Envato purchase code (optional, press Enter to skip): ${NC}"
    read -r PURCHASE_CODE

    if [[ -n "$PURCHASE_CODE" ]]; then
        log_progress "Saving purchase code"
        if ! php artisan tinker --execute="
            \App\Models\SystemSetting::set('purchase_code', '$PURCHASE_CODE', 'string', 'general');
            \App\Models\SystemSetting::set('sentry_enabled', true, 'boolean', 'general');
        " >/dev/null 2>&1; then
            log_warning "Failed to save purchase code - configure in Admin > Settings > General"
        fi
    fi

    log_progress "Marking installation as completed"
    if ! php artisan tinker --execute="
        \App\Models\SystemSetting::set('installation_completed', true, 'boolean', 'app');
        \App\Models\SystemSetting::set('site_name', '$APP_NAME', 'string', 'general');
    " >/dev/null 2>&1; then
        log_warning "Failed to mark installation as completed - configure in admin panel"
    fi

    log_progress "Creating storage symlink"
    php artisan storage:link

    log_progress "Optimizing Laravel for production"
    php artisan route:cache
    php artisan view:cache
    # NOTE: config:cache and cache:clear are deferred to finalize_cache()
    # to avoid stale cache from settings written in later steps (Reverb, Builder, Domains)

    log_success "Laravel application setup completed"
}

# Setup builder server
setup_builder() {
    log_header "SETTING UP BUILDER SERVER"

    cd $BUILDER_DIR || { log_error "Failed to enter $BUILDER_DIR"; exit 1; }

    chmod +x webby-builder-linux
    mkdir -p storage

    log_success "Builder binary ready (will be started via PM2 ecosystem config)"
}

# Register builder in database
register_builder() {
    log_header "REGISTERING BUILDER IN DATABASE"

    cd $WEBBY_DIR || { log_error "Failed to enter $WEBBY_DIR"; exit 1; }

    if ! php artisan tinker --execute="
        use App\Models\Builder;

        // Remove any seeded placeholder builders (disable FK checks for truncate)
        \DB::statement('SET FOREIGN_KEY_CHECKS=0');
        Builder::truncate();
        \DB::statement('SET FOREIGN_KEY_CHECKS=1');

        Builder::create([
            'name' => 'Local Builder',
            'url' => 'http://127.0.0.1',
            'port' => $BUILDER_PORT,
            'server_key' => '$BUILDER_KEY',
            'max_iterations' => 50,
            'status' => 'active',
        ]);
    " >/dev/null 2>&1; then
        log_warning "Failed to register builder - configure manually in Admin > Builders"
    else
        log_success "Builder registered in database"
    fi
}

# Setup Reverb WebSocket server
setup_reverb() {
    log_header "SETTING UP REVERB WEBSOCKET SERVER"

    cd $WEBBY_DIR || { log_error "Failed to enter $WEBBY_DIR"; exit 1; }

    # Create ecosystem.config.cjs for both Builder and Reverb
    log_progress "Creating PM2 ecosystem configuration"
    cat > "$WEBBY_DIR/ecosystem.config.cjs" <<EOF
module.exports = {
  apps: [
    {
      name: 'webby-builder',
      cwd: '$BUILDER_DIR',
      script: './webby-builder-linux',
      args: '-key=$BUILDER_KEY -port=$BUILDER_PORT',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    },
    {
      name: 'webby-reverb',
      cwd: '$WEBBY_DIR',
      script: 'artisan',
      args: 'reverb:start --host=0.0.0.0 --port=$REVERB_PORT',
      interpreter: 'php',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    }
  ]
}
EOF

    chown www-data:www-data "$WEBBY_DIR/ecosystem.config.cjs"

    log_wait "Starting Builder and Reverb servers with PM2"
    # Stop existing processes first to avoid duplicates on resume
    pm2 delete webby-builder 2>/dev/null || true
    pm2 delete webby-reverb 2>/dev/null || true
    pm2 start "$WEBBY_DIR/ecosystem.config.cjs"
    pm2 save
    pm2 startup systemd -u root --hp /root >/dev/null 2>&1

    log_success "Builder server started on port $BUILDER_PORT"
    log_success "Reverb WebSocket server started on port $REVERB_PORT"
}

# Configure Reverb settings in database
configure_reverb_settings() {
    log_header "CONFIGURING REVERB SETTINGS IN DATABASE"

    cd $WEBBY_DIR || { log_error "Failed to enter $WEBBY_DIR"; exit 1; }

    # Credentials were already generated in generate_credentials() function
    log_progress "Saving Reverb settings to database..."
    log_info "Reverb App ID: $REVERB_APP_ID"
    log_info "Reverb Key: 32 characters"
    log_info "Reverb Secret: 64 characters"
    log_info "Reverb Host: $REVERB_SUBDOMAIN.$CANONICAL_DOMAIN"

    # Save to database (Admin > Settings > Integrations)
    php artisan tinker --execute="
        \App\Models\SystemSetting::setMany([
            'broadcast_driver' => 'reverb',
            'reverb_app_id' => '$REVERB_APP_ID',
            'reverb_key' => '$REVERB_KEY',
            'reverb_secret' => '$REVERB_SECRET',
            'reverb_host' => '$REVERB_SUBDOMAIN.$CANONICAL_DOMAIN',
            'reverb_port' => 443,
            'reverb_scheme' => 'https',
        ], 'integrations');
    " >/dev/null 2>&1

    if [[ $? -eq 0 ]]; then
        log_success "Reverb settings saved to database"
        log_success "Reverb host: wss://$REVERB_SUBDOMAIN.$CANONICAL_DOMAIN"
        log_info "Settings visible at: Admin > Settings > Integrations"
    else
        log_warning "Could not save Reverb settings - configure manually in Admin > Settings > Integrations"
    fi
}

# Configure Laravel scheduler cron job
configure_cron() {
    log_header "CONFIGURING LARAVEL SCHEDULER CRON JOB"

    log_progress "Setting up cron job for Laravel scheduler"

    # Create cron job for www-data user to run Laravel scheduler every minute
    CRON_JOB="* * * * * cd $WEBBY_DIR && php artisan schedule:run >> /dev/null 2>&1"

    # Check if cron job already exists
    if crontab -u www-data -l 2>/dev/null | grep -q "artisan schedule:run"; then
        log_info "Laravel scheduler cron job already exists"
    else
        # Add cron job for www-data user
        (crontab -u www-data -l 2>/dev/null || true; echo "$CRON_JOB") | crontab -u www-data -
        log_success "Laravel scheduler cron job added for www-data user"
    fi

    # Verify cron job was added
    if crontab -u www-data -l 2>/dev/null | grep -q "artisan schedule:run"; then
        log_success "Cron job verified: Laravel scheduler will run every minute"
    else
        log_warning "Failed to verify cron job - you may need to add it manually"
        log_info "Manual command: crontab -u www-data -e"
        log_info "Add this line: $CRON_JOB"
    fi
}

# Configure firewall
configure_firewall() {
    log_header "CONFIGURING FIREWALL"

    apt install -y ufw >/dev/null 2>&1

    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 'Nginx Full'

    ufw --force enable

    log_success "Firewall configured"
}

# Finalize cache after all database settings are written
finalize_cache() {
    log_header "FINALIZING CACHE"

    cd $WEBBY_DIR || { log_error "Failed to enter $WEBBY_DIR"; exit 1; }

    log_progress "Clearing stale cache and rebuilding"
    php artisan cache:clear
    php artisan config:cache

    log_success "Cache finalized with all settings applied"
}

# Verify installation
verify_installation() {
    log_header "VERIFYING INSTALLATION"

    if systemctl is-active --quiet nginx; then
        log_success "Nginx is running"
    else
        log_warning "Nginx is not running"
    fi

    if systemctl is-active --quiet php8.4-fpm; then
        log_success "PHP-FPM is running"
    else
        log_warning "PHP-FPM is not running"
    fi

    if systemctl is-active --quiet mysql; then
        log_success "MySQL is running"
    else
        log_warning "MySQL is not running"
    fi

    if [[ -f "/etc/letsencrypt/live/$CANONICAL_DOMAIN/fullchain.pem" ]]; then
        log_success "SSL certificate installed"
    else
        log_warning "SSL certificate not found"
    fi

    if [[ -d "$WEBBY_DIR/public/build" ]]; then
        log_success "Frontend assets built"
    else
        log_warning "Frontend assets not found"
    fi

    if crontab -u www-data -l 2>/dev/null | grep -q "artisan schedule:run"; then
        log_success "Laravel scheduler cron job configured"
    else
        log_warning "Laravel scheduler cron job not found"
    fi

    if pm2 list | grep -q "webby-builder.*online"; then
        log_success "Builder server is running"
    else
        log_warning "Builder server is not running"
    fi

    if pm2 list | grep -q "webby-reverb.*online"; then
        log_success "Reverb server is running"
    else
        log_warning "Reverb server is not running"
    fi
}

# Display final information
show_final_info() {
    log_highlight "WEBBY INSTALLATION COMPLETED!"

    echo -e "${GREEN}Your Webby platform is now live!${NC}\n"

    echo -e "${YELLOW}ACCESS YOUR PLATFORM:${NC}"
    echo -e "  Website: ${CYAN}$SITE_URL${NC}"
    echo ""

    echo -e "${YELLOW}ADMIN LOGIN:${NC}"
    echo -e "  URL: ${CYAN}$SITE_URL/login${NC}"
    echo -e "  Email: ${ADMIN_EMAIL}"
    echo -e "  Password: ${ADMIN_PASSWORD}"
    echo ""

    echo -e "${YELLOW}DATABASE CREDENTIALS:${NC}"
    echo -e "  Host: ${DB_HOST}"
    echo -e "  Database: ${DB_NAME}"
    echo -e "  Username: ${DB_USERNAME}"
    echo -e "  Password: ${DB_PASSWORD}"
    echo -e "  MySQL Root: ${MYSQL_ROOT_PASSWORD}"
    echo ""

    echo -e "${YELLOW}BUILDER SERVER:${NC}"
    echo -e "  URL: ${CYAN}http://127.0.0.1:$BUILDER_PORT${NC}"
    echo -e "  Server Key: ${BUILDER_KEY}"
    echo -e "  Status: ${CYAN}pm2 status webby-builder${NC}"
    echo -e "  Logs: ${CYAN}pm2 logs webby-builder${NC}"
    echo -e "  Restart: ${CYAN}pm2 restart webby-builder${NC}"
    echo ""

    echo -e "${YELLOW}REVERB WEBSOCKET SERVER:${NC}"
    echo -e "  Host: ${CYAN}wss://$REVERB_SUBDOMAIN.$CANONICAL_DOMAIN${NC}"
    echo -e "  Internal: ${CYAN}http://127.0.0.1:$REVERB_PORT${NC}"
    echo -e "  App ID: ${REVERB_APP_ID}"
    echo -e "  Key: ${REVERB_KEY}"
    echo -e "  Secret: ${REVERB_SECRET}"
    echo -e "  Status: ${CYAN}pm2 status webby-reverb${NC}"
    echo -e "  Logs: ${CYAN}pm2 logs webby-reverb${NC}"
    echo -e "  Restart: ${CYAN}pm2 restart webby-reverb${NC}"
    echo ""

    echo -e "${YELLOW}CONFIGURE AI PROVIDERS:${NC}"
    echo -e "  AI Providers: ${CYAN}$SITE_URL/admin/ai-providers${NC}"
    echo -e "  Plans: ${CYAN}$SITE_URL/admin/plans${NC}"
    echo -e "  Settings: ${CYAN}$SITE_URL/admin/settings${NC}"
    echo ""

    echo -e "${YELLOW}SSL CERTIFICATE:${NC}"
    echo -e "  Status: ${GREEN}Active${NC}"
    echo -e "  Auto-renewal: ${GREEN}Enabled${NC}"
    echo -e "  Check: ${CYAN}sudo certbot certificates${NC}"
    echo ""

    echo -e "${YELLOW}DATABASE MANAGER:${NC}"
    echo -e "  Adminer: ${CYAN}https://$CANONICAL_DOMAIN/adminer${NC}"
    echo -e "  Username: ${CYAN}$DB_USERNAME${NC}"
    echo -e "  Password: ${CYAN}(see Database Credentials above)${NC}"
    echo ""

    echo -e "${YELLOW}LARAVEL SCHEDULER:${NC}"
    echo -e "  Status: ${GREEN}Active${NC} (runs every minute)"
    echo -e "  View cron: ${CYAN}crontab -u www-data -l${NC}"
    echo -e "  Edit cron: ${CYAN}crontab -u www-data -e${NC}"
    echo -e "  Handles: Build credits reset, notifications, subscriptions, cleanup jobs"
    echo ""

    echo -e "${YELLOW}INSTALLATION PATHS:${NC}"
    echo -e "  Laravel App: ${CYAN}$WEBBY_DIR${NC}"
    echo -e "  Builder: ${CYAN}$BUILDER_DIR${NC}"
    echo -e "  Install Log: ${CYAN}$INSTALL_LOG${NC}"
    echo ""

    echo -e "${RED}IMPORTANT: Save these credentials now!${NC}"
}

# Show help
show_help() {
    echo ""
    echo -e "${CYAN}Webby - Fully Automated VPS Setup with SSL${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./autosetup.sh [--domain yourdomain.com]"
    echo ""
    echo -e "${YELLOW}Prerequisites:${NC}"
    echo "  1. Fresh Ubuntu 22.04/24.04 LTS VPS"
    echo "  2. Upload CodeCanyon ZIP contents to /home/ (Install/, Builder/, Documentation/)"
    echo "  3. Domain name pointed to server IP"
    echo ""
    echo -e "${YELLOW}What gets installed:${NC}"
    echo "  • PHP 8.4 with all Laravel extensions"
    echo "  • MySQL 8.0 Database Server"
    echo "  • Nginx Web Server with PHP-FPM"
    echo "  • Node.js 20 LTS (for frontend build)"
    echo "  • PM2 Process Manager"
    echo "  • Let's Encrypt SSL Certificate"
    echo "  • Adminer Database Manager"
    echo "  • Laravel Scheduler Cron Job"
    echo "  • Builder Server (on port $BUILDER_PORT)"
    echo "  • Reverb WebSocket Server (on port $REVERB_PORT)"
    echo ""
    echo -e "${YELLOW}Auto-generated credentials:${NC}"
    echo "  • MySQL root password"
    echo "  • Database user and password"
    echo "  • Admin password"
    echo "  • Builder server key"
    echo "  • Reverb credentials (App ID, Key, Secret)"
    echo ""
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --domain)
                if validate_and_process_domain "$2"; then
                    SITE_URL="https://${CANONICAL_DOMAIN}"
                    ADMIN_EMAIL="admin@${CANONICAL_DOMAIN}"
                    shift 2
                else
                    log_error "Invalid domain provided: $2"
                    exit 1
                fi
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Main execution
main() {
    setup_logging "$@"

    log_highlight "WEBBY - AUTOMATED VPS SETUP"

    parse_arguments "$@"
    check_root
    check_disk_space 10

    # Check for previous installation state
    if check_resume; then
        log_info "Resuming from previous state..."
    else
        # Fresh installation - run initialization steps
        organize_uploaded_files
        verify_upload_structure
        generate_credentials

        if [[ -z "$DOMAIN" ]]; then
            get_domain
        fi
    fi

    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}                                  READY TO BEGIN INSTALLATION${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Setup Preview:${NC}"
    echo -e "${GREEN}  Domain: ${CYAN}$CANONICAL_DOMAIN${NC}"
    echo -e "${GREEN}  Site URL: ${CYAN}$SITE_URL${NC}"
    echo -e "${GREEN}  Admin Email: ${CYAN}$ADMIN_EMAIL${NC}"
    echo -e "${GREEN}  SSL: ${CYAN}Let's Encrypt (auto-renewal enabled)${NC}"
    echo -e "${GREEN}  Passwords: ${CYAN}Auto-generated securely${NC}"
    echo ""
    echo -e "${YELLOW}This will install:${NC}"
    echo -e "${CYAN}  • PHP 8.4 + Extensions${NC}"
    echo -e "${CYAN}  • MySQL 8.0${NC}"
    echo -e "${CYAN}  • Nginx + PHP-FPM${NC}"
    echo -e "${CYAN}  • Node.js 20 + PM2${NC}"
    echo -e "${CYAN}  • SSL Certificate${NC}"
    echo -e "${CYAN}  • Laravel Scheduler Cron${NC}"
    echo -e "${CYAN}  • Builder Server (port $BUILDER_PORT)${NC}"
    echo -e "${CYAN}  • Reverb WebSocket (port $REVERB_PORT)${NC}"
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -en "${CYAN}${BOLD}>>> Continue with automated setup? (y/N): ${NC}"
    read -n 1 -r REPLY
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        log_warning "Setup cancelled by user"
        exit 0
    fi

    echo ""
    log_success "Installation confirmed! Starting automated setup..."
    echo ""

    # Run each step through the state management wrapper
    run_step "system_update" update_system || exit 1
    run_step "php_install" install_php || exit 1
    run_step "mysql_install" install_mysql || exit 1
    run_step "database_create" create_database || exit 1
    run_step "nginx_install" install_nginx || exit 1
    run_step "ssl_install" install_ssl || exit 1
    run_step "custom_domain_setup" setup_custom_domain_support || exit 1
    run_step "adminer_install" install_adminer || exit 1
    run_step "nodejs_install" install_nodejs || exit 1
    run_step "laravel_setup" setup_laravel || exit 1
    run_step "builder_setup" setup_builder || exit 1
    run_step "builder_register" register_builder || exit 1
    run_step "reverb_setup" setup_reverb || exit 1
    run_step "reverb_settings" configure_reverb_settings || exit 1
    run_step "cron_configure" configure_cron || exit 1
    run_step "firewall_configure" configure_firewall || exit 1
    run_step "wildcard_ssl" install_wildcard_ssl || exit 1
    run_step "domain_settings" configure_domain_settings || exit 1
    run_step "finalize_cache" finalize_cache || exit 1
    run_step "verify_install" verify_installation || exit 1

    # Cleanup state files on successful completion
    cleanup_state_files

    show_final_info

    log_success "Full automation setup completed!"

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] Setup completed successfully - exiting" >> "$INSTALL_LOG"
    exit 0
}

main "$@"
