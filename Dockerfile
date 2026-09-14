FROM php:8.4-fpm

WORKDIR /var/www/html

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    git \
    unzip \
    nginx \
    supervisor \
    netcat-openbsd \
    ca-certificates \
    libfreetype6-dev \
    libjpeg62-turbo-dev \
    libpng-dev \
    libonig-dev \
    libzip-dev \
    libicu-dev \
    && rm -rf /var/lib/apt/lists/*

# Install essential PHP extensions
RUN docker-php-ext-install -j$(nproc) \
    bcmath \
    calendar \
    gd \
    intl \
    pdo_mysql \
    zip \
    && docker-php-ext-enable bcmath calendar gd intl pdo_mysql zip

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy application (from Install directory which contains the Laravel app)
COPY Install/ .

# Create necessary directories
RUN mkdir -p /var/www/html/bootstrap/cache \
    && mkdir -p /var/www/html/storage/app/public \
    && mkdir -p /var/www/html/storage/framework/cache/data \
    && mkdir -p /var/www/html/storage/framework/sessions \
    && mkdir -p /var/www/html/storage/framework/views \
    && mkdir -p /var/www/html/storage/logs

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 775 /var/www/html/storage \
    && chmod -R 775 /var/www/html/bootstrap/cache

# Copy docker configs
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/nginx.conf /etc/nginx/sites-enabled/default
COPY docker/php-fpm-www.conf /usr/local/etc/php-fpm.d/www.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/zzz-webby.ini
COPY docker/bootstrap.php /var/www/html/docker/bootstrap.php
COPY docker/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Composer install with platform requirement ignores
RUN composer install --no-dev --no-scripts --optimize-autoloader \
    --ignore-platform-req=ext-grpc \
    --ignore-platform-req=ext-gmp

# NPM install and build
RUN npm install && npm run build

# Create necessary directories
RUN mkdir -p /run/php \
    && mkdir -p /var/log/supervisor

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
