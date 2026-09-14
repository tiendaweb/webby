#!/bin/bash
set +e  # Don't exit on errors

cd /var/www/html

# Create .env from .env.example if not exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
fi

# Only clear placeholder APP_KEY if it's the default from .env.example
CURRENT_KEY=$(grep "^APP_KEY=" .env | cut -d'=' -f2-)
if [ "$CURRENT_KEY" == "base64:PLACEHOLDER_KEY_WILL_BE_GENERATED_AT_RUNTIME" ] || [ -z "$CURRENT_KEY" ]; then
    sed -i 's/^APP_KEY=.*/APP_KEY=/' .env
fi

# Update .env with runtime configuration from environment variables
set_env_value() {
    local key="$1"
    local value="$2"

    if grep -q "^${key}=" .env; then
        sed -i "s#^${key}=.*#${key}=${value}#" .env
    else
        echo "${key}=${value}" >> .env
    fi
}

set_env_value "APP_URL" "${APP_URL:-http://localhost:3100}"
set_env_value "APP_BASE_DOMAIN" "${APP_BASE_DOMAIN:-}"
sed -i "s/^APP_ENV=.*/APP_ENV=${APP_ENV:-production}/" .env
sed -i "s/^DB_HOST=.*/DB_HOST=${DB_HOST:-webby-mysql}/" .env
sed -i "s/^DB_PORT=.*/DB_PORT=${DB_PORT:-3306}/" .env
sed -i "s/^DB_DATABASE=.*/DB_DATABASE=${DB_DATABASE:-webby}/" .env
sed -i "s/^DB_USERNAME=.*/DB_USERNAME=${DB_USERNAME:-webby}/" .env
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD:-webby_secret_2024}/" .env

# Generate APP_KEY if not set or empty
if ! grep -q "^APP_KEY=base64:" .env; then
    echo "Generating APP_KEY..."
    php artisan key:generate --force
fi

# Load all environment variables from .env file for this shell
set -a
source .env
set +a

# Extract APP_KEY and export for use with supervisord
APP_KEY_VALUE=$(grep "^APP_KEY=" .env | cut -d'=' -f2-)
export APP_KEY="$APP_KEY_VALUE"

# Create supervisord environment file with APP_KEY
mkdir -p /tmp/supervisord
cat > /tmp/supervisord/env.conf <<EOF
APP_KEY=$APP_KEY_VALUE
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
EOF

# Update supervisord.conf to include APP_KEY as an actual variable value
# Read original config and replace the environment directives
{
  while IFS= read -r line; do
    if [[ "$line" == *"%(ENV_APP_KEY)s"* ]]; then
      echo "${line//%(ENV_APP_KEY)s/$APP_KEY_VALUE}"
    else
      echo "$line"
    fi
  done < /etc/supervisor/conf.d/supervisord.conf
} > /tmp/supervisord_updated.conf && mv /tmp/supervisord_updated.conf /etc/supervisor/conf.d/supervisord.conf

ensure_laravel_writable_dirs() {
    mkdir -p bootstrap/cache \
        storage/app/public \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs

    chown -R www-data:www-data storage bootstrap/cache
    chmod -R ug+rwX storage bootstrap/cache
}

# Create necessary directories
ensure_laravel_writable_dirs

# The storage directory is a Docker volume, while public/ belongs to the
# container image. Recreate Laravel's public storage link on every startup so
# uploaded thumbnails and other public files remain reachable after a deploy.
if [ -L public/storage ]; then
    ln -sfn ../storage/app/public public/storage
elif [ ! -e public/storage ]; then
    ln -s ../storage/app/public public/storage
else
    echo "Warning: public/storage exists and is not a symlink; leaving it unchanged"
fi

# Wait for MySQL to be ready (max 30 attempts, 2 seconds each = 60 seconds)
echo "Waiting for MySQL to be ready..."
DB_HOST=$(grep "^DB_HOST=" .env | cut -d'=' -f2)
DB_PORT=$(grep "^DB_PORT=" .env | cut -d'=' -f2)
DB_USER=$(grep "^DB_USERNAME=" .env | cut -d'=' -f2)
DB_PASS=$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2)

attempts=0
until [ $attempts -ge 30 ] || nc -z ${DB_HOST} ${DB_PORT}; do
    echo "Attempt $((attempts + 1)): MySQL not ready yet, waiting..."
    sleep 2
    attempts=$((attempts + 1))
done

if [ $attempts -ge 30 ]; then
    echo "Warning: MySQL did not become ready in time"
else
    echo "MySQL is ready, running migrations..."
    php artisan migrate --force || echo "Warning: migrations failed, continuing anyway"
fi

# Artisan commands above can create cache files as root during container startup.
ensure_laravel_writable_dirs

# Skip config caching - let Laravel load .env dynamically to ensure APP_KEY is available
# php artisan config:cache 2>/dev/null || true
# php artisan route:cache 2>/dev/null || true
# php artisan view:cache 2>/dev/null || true

# Make builder binary executable
chmod +x Builder/prebuilt/webby-builder-linux 2>/dev/null || true

# Ensure nginx configuration is correct for Laravel (fix fastcgi buffer sizes)
if ! grep -q "fastcgi_buffer_size" /etc/nginx/sites-enabled/default; then
    sed -i "/fastcgi_pass.*sock/a\\        fastcgi_buffer_size 128k;\\n        fastcgi_buffers 4 256k;\\n        fastcgi_busy_buffers_size 256k;" /etc/nginx/sites-enabled/default
fi

echo "Starting supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
