# Custom domain: {{ $domain }}
# Project ID: {{ $project_id }}
# Generated: {{ now()->toDateTimeString() }}
server {
    listen 80;
    server_name {{ $domain }};
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name {{ $domain }};
    root /home/webby/public;
    index index.php index.html;

    ssl_certificate /etc/letsencrypt/live/{{ $domain }}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{{ $domain }}/privkey.pem;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 100M;

    # Custom domain header for Laravel to identify the project
    set $custom_domain "{{ $domain }}";

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param HTTP_X_CUSTOM_DOMAIN $custom_domain;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|zip)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
