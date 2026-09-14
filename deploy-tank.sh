#!/usr/bin/env bash
#
# Publica el juego de tanques desde una copia local al sitio real
# (tank.aapp.pro), sin pasar por la interfaz de Webby.
#
# Cómo sirve Webby un proyecto publicado (PublishedProjectController):
#   project-files/{id}/  ← el espacio de trabajo; es lo que ve el editor
#   previews/{id}/       ← lo que realmente se sirve por el subdominio
#   published/{id}/      ← caché de HTML y JS ya procesados para el subdominio
#
# Copiar sólo en project-files no cambia nada de lo que ve el visitante, y
# copiar sólo en published deja una caché que miente sobre un archivo que no
# existe. Por eso este script hace las tres cosas en orden: escribe el
# espacio de trabajo, lo sincroniza a previews con el propio servicio de
# Webby, y tira la caché.
#
# Uso: /opt/webby/deploy-tank.sh [carpeta-origen]
set -euo pipefail

ORIGEN=${1:-/tmp/claude-0/-/baa92e08-2cb2-48f1-adce-225239d9e255/scratchpad/tank}
ID=01a04158-3e84-72bc-8727-bdd68b5dc9c3
CONTENEDOR=webby-app
BASE=/var/www/html/storage/app/private

[ -d "$ORIGEN" ] || { echo "error: no existe $ORIGEN" >&2; exit 1; }
docker ps --format '{{.Names}}' | grep -qx "$CONTENEDOR" \
    || { echo "error: el contenedor $CONTENEDOR no está corriendo" >&2; exit 1; }

echo "→ copiando el espacio de trabajo"
docker exec "$CONTENEDOR" mkdir -p "$BASE/project-files/$ID/game" "$BASE/project-files/$ID/tools"
for f in index.html style.css diagnostico.html; do
    [ -f "$ORIGEN/$f" ] && docker cp "$ORIGEN/$f" "$CONTENEDOR:$BASE/project-files/$ID/$f"
done
for f in "$ORIGEN"/game/*.js;  do docker cp "$f" "$CONTENEDOR:$BASE/project-files/$ID/game/$(basename "$f")"; done
for f in "$ORIGEN"/tools/*.mjs; do docker cp "$f" "$CONTENEDOR:$BASE/project-files/$ID/tools/$(basename "$f")"; done

# docker cp entra como root; php-fpm corre como www-data y con los permisos
# 0700 de las carpetas de storage no podría ni listar el directorio. Sin
# este chown el sitio devuelve 404 en todo, con los archivos ahí puestos.
docker exec "$CONTENEDOR" chown -R www-data:www-data "$BASE/project-files/$ID"

# artisan corre como root: www-data no puede leer el .env del contenedor
# (0600 root), así que tinker ni siquiera arranca con -u www-data. El precio
# es que los archivos nuevos quedan de root, y por eso vuelve el chown.
echo "→ sincronizando previews (staging + swap atómico)"
docker exec "$CONTENEDOR" php /var/www/html/artisan tinker --execute="
    \$p = \App\Models\Project::find('$ID');
    app(\App\Services\ProjectWorkspaceService::class)->syncPreviewSafely(\$p);
"
docker exec "$CONTENEDOR" chown -R www-data:www-data "$BASE/previews/$ID"

echo "→ tirando la caché del subdominio"
docker exec "$CONTENEDOR" rm -rf "$BASE/published/$ID"

echo "→ comprobando"
fallo=0
for ruta in / /style.css /game/core.js /game/net.js /game/menu.js; do
    codigo=$(curl -s -o /dev/null -w '%{http_code}' "https://tank.aapp.pro$ruta")
    printf '   %-16s %s\n' "$ruta" "$codigo"
    [ "$codigo" = 200 ] || fallo=1
done
[ $fallo = 0 ] || { echo "✗ hay rutas que no responden 200" >&2; exit 1; }
echo "✓ publicado en https://tank.aapp.pro/"
