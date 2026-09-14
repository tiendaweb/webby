#!/usr/bin/env bash
#
# Deploy the MCP connector work (Connect screen + admin/project MCP servers)
# from the source tree at /opt/webby/Install into the running webby-app
# container, without rebuilding the image.
#
# Why file-by-file instead of `docker compose build`: /var/www/html is baked
# into the image, and a rebuild also re-runs `composer install` and
# `npm install` (not `ci`), so it can drift dependencies that are currently
# known-good in production. This script copies exactly the files that
# changed, then clears the Laravel caches that would otherwise hide new
# routes and providers.
#
# Re-run it after ANY `docker compose up -d` that recreates webby-app —
# docker cp does not survive container recreation. Running it twice is
# harmless.
#
# Usage: /opt/webby/deploy-mcp-connect.sh
set -euo pipefail

SRC=/opt/webby/Install
CONTAINER=webby-app

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    echo "error: container $CONTAINER is not running" >&2
    exit 1
fi

FILES=(
    # --- MCP transport
    app/Http/Controllers/Api/Mcp/McpController.php
    app/Http/Controllers/Api/Mcp/McpAdminController.php
    app/Http/Controllers/Api/Mcp/McpProjectController.php
    app/Http/Middleware/McpCors.php
    app/Http/Middleware/VerifyMcpUrlToken.php
    app/Http/Middleware/VerifyConnectorToken.php
    bootstrap/app.php
    routes/api.php
    routes/web.php

    # --- OAuth 2.1 (discovery, dynamic registration, consent, tokens)
    database/migrations/2026_08_27_000001_create_oauth_connector_tables.php
    app/Models/OAuthClient.php
    app/Models/OAuthAuthorizationCode.php
    app/Models/OAuthRefreshToken.php
    app/Services/Oauth/OAuthServerService.php
    app/Http/Controllers/Oauth/DiscoveryController.php
    app/Http/Controllers/Oauth/RegistrationController.php
    app/Http/Controllers/Oauth/AuthorizationController.php
    app/Http/Controllers/Oauth/TokenController.php

    # --- Chat notes for the connectors (a message lane that never reaches
    # the AI builder) + the mobile-navigable editor
    app/Models/Project.php
    app/Http/Controllers/ProjectNoteController.php
    lang/en/notes.json
    lang/es/notes.json

    # --- Retirada de la señalización propia (el juego usa el broker de PeerJS)
    database/migrations/2026_08_28_000001_drop_signaling_tables.php

    # --- Selector rápido de proyectos: la casita del builder abre un modal
    # en vez de sacarte a /projects
    app/Http/Controllers/ProjectController.php
    lang/en/projects.json
    lang/es/projects.json

    # --- Connect screen
    app/Http/Controllers/McpConnectController.php
    app/Http/Controllers/Admin/AdminApiTokenController.php
    app/Http/Controllers/ProjectAiConnectorController.php
    lang/en/connect.json
    lang/es/connect.json

    # --- Tool registry + shared services
    app/Providers/McpServiceProvider.php
    app/Services/Database/DatabaseAdminService.php

    # --- Tools
    app/Services/ProjectWorkspaceService.php
    app/Console/Commands/McpSelfTest.php
    app/Services/ProjectRevisionService.php
    app/Services/ProjectSeoService.php
    app/Services/ProjectStructureService.php
    app/Services/ProjectColorScanService.php
    app/Services/DomainVerificationService.php
    app/Services/AdminStatsService.php
    app/Models/ProjectRevision.php
    app/Models/AuditLog.php
    app/Models/McpToolCall.php
    app/Services/Firestore/FirestoreDataService.php
)

# Note: files land one at a time, so for the couple of seconds this loop
# runs, a request that arrives mid-copy can hit a provider that references a
# class not written yet ("Target class ... does not exist" in laravel.log).
# It clears itself the moment the loop finishes; deploy off-peak if that
# matters.
# El árbol de herramientas MCP se sincroniza entero, no fichero a fichero.
#
# La lista de abajo sólo sabe sumar: cuando una herramienta se retira, su
# clase se queda viva dentro del contenedor y el registro sigue pudiendo
# instanciarla. Retirar la señalización propia obligó a borrar tres ficheros
# a mano, que es exactamente el tipo de paso que un día se olvida.
#
# Para este árbol se borra el destino y se vuelca de nuevo: es autocontenido
# (nada más escribe dentro de app/Services/Mcp), así que borrarlo entero es
# seguro y deja el contenedor igual que el origen, no parecido.
echo "→ syncing app/Services/Mcp (sync, not merge: removals propagate)"
docker exec "$CONTAINER" rm -rf /var/www/html/app/Services/Mcp.new /var/www/html/app/Services/Mcp.old
docker exec "$CONTAINER" mkdir -p /var/www/html/app/Services/Mcp.new
tar -C "$SRC/app/Services/Mcp" -cf - . | docker exec -i "$CONTAINER" tar -C /var/www/html/app/Services/Mcp.new -xf -
# El cambio va por renombrado, no borrando y volcando encima.
#
# Borrar primero deja varios segundos en los que el árbol de herramientas no
# existe, y cada petición que entra en esa ventana muere con "Target class
# ... does not exist" — se vio en el log en el primer intento. Dos renombrados
# reducen esa ventana a un instante.
docker exec "$CONTAINER" sh -c '
    cd /var/www/html/app/Services &&
    if [ -d Mcp ]; then mv Mcp Mcp.old; fi &&
    mv Mcp.new Mcp &&
    rm -rf Mcp.old
'

echo "→ copying ${#FILES[@]} PHP/lang files"
for file in "${FILES[@]}"; do
    if [ ! -f "$SRC/$file" ]; then
        echo "error: missing source file $SRC/$file" >&2
        exit 1
    fi
    docker exec "$CONTAINER" mkdir -p "/var/www/html/$(dirname "$file")"
    docker cp "$SRC/$file" "$CONTAINER:/var/www/html/$file"
done

# nginx's blanket "deny all dot-paths" rule would 403 /.well-known/, and
# without those documents no OAuth client can discover how to authenticate.
echo "→ syncing nginx config (/.well-known/ exception)"
docker cp /opt/webby/docker/nginx.conf "$CONTAINER:/etc/nginx/sites-enabled/default"
docker exec "$CONTAINER" nginx -t >/dev/null 2>&1 && docker exec "$CONTAINER" nginx -s reload

echo "→ copying built frontend assets (public/build)"
docker exec "$CONTAINER" rm -rf /var/www/html/public/build
docker cp "$SRC/public/build" "$CONTAINER:/var/www/html/public/build"

# A handful of files are bind-mounted read-only from the host (see the
# volumes: block in docker-compose.yml); chown cannot touch those and does
# not need to, so its failures are ignored deliberately.
echo "→ fixing ownership"
docker exec "$CONTAINER" chown -R www-data:www-data /var/www/html/app /var/www/html/routes \
    /var/www/html/bootstrap/app.php /var/www/html/lang /var/www/html/public/build 2>/dev/null || true

echo "→ running migrations (tablas oauth_*, y la retirada de signaling_*)"
docker exec "$CONTAINER" php artisan migrate --force

echo "→ clearing Laravel caches (new routes + provider registrations)"
docker exec "$CONTAINER" php artisan optimize:clear

# artisan corre como root dentro del contenedor, y todo lo que escriba en
# storage —caché, vistas compiladas, sesiones— queda de root. php-fpm corre
# como www-data: en cuanto necesita crear un fichero de caché dentro de un
# directorio que dejó root, la aplicación entera devuelve 500. Pasó, y el
# error que se ve ("file_put_contents: No such file or directory") no dice
# ni de lejos que el problema sea de permisos.
echo "→ normalising storage ownership (artisan ran as root)"
docker exec "$CONTAINER" chown -R www-data:www-data /var/www/html/storage

echo "→ reloading php-fpm (opcache)"
docker exec "$CONTAINER" sh -c 'kill -USR2 1 2>/dev/null || supervisorctl restart php-fpm 2>/dev/null || true'

echo "✓ done. Verify: curl -sS -X POST https://aapp.pro/api/mcp/admin -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\"}'"
