# Conector MCP Claude v2 — Estado del trabajo

> **2026-08-26 — TERMINADO Y DESPLEGADO.** Todo lo que figuraba como pendiente en la sección 4
> (A–G) está hecho, verificado contra https://aapp.pro y en producción.
> La documentación de uso vive ahora en `/opt/webby/CONECTORES.md`; el despliegue se rehace con
> `/opt/webby/deploy-mcp-connect.sh` (hay que volver a correrlo si se recrea `webby-app`).
>
> Diferencias respecto del plan original, y por qué:
> - **Las 11 tools de BD se consolidaron en 5** (`admin_db_connections_list`,
>   `admin_db_tables_list`, `admin_db_rows_list`, `admin_db_rows_write` con `action`,
>   `admin_db_schema` con `action`). Un catálogo más corto mejora qué herramienta elige el modelo
>   en un servidor de 40.
> - **Se agregó lo que el plan no contemplaba y hacía falta para que Claude/ChatGPT/Grok
>   conectaran de verdad**: autenticación con el token en la URL (`/api/mcp/{server}/k/{token}`),
>   negociación de versión de protocolo, respuestas vacías a `prompts/list`/`resources/list`,
>   CORS/OPTIONS, 401 JSON en vez de redirect a /login, `admin_projects_import` (subir ZIP) y las
>   tools `search`/`fetch` que exige el contrato de conectores de ChatGPT.
>
> Bugs preexistentes encontrados y corregidos al verificar:
> - `AdminProjectsCreateTool`: `Undefined array key "type"` cuando no se pasaba `type`.
> - `DatabaseAdminService::primaryKeysFor()`: MySQL 8 devuelve las columnas de
>   `information_schema` en mayúsculas, así que el pluck por `Column_name` no encontraba nada y
>   **ninguna tabla tenía clave primaria** → update/delete por `row_key` era imposible.
> - `DatabaseAdminService::sqlType()`: `increments` caía en `TEXT` y MySQL rechazaba el
>   `AUTO_INCREMENT`.
> - `url()` en respuestas de API emitía `http://` porque `TrustProxies` solo estaba en el grupo
>   `web`; ahora también en `api`, y las URLs que se copian salen de `APP_URL`.
>
> Lo de abajo queda como registro de lo que había el 2026-08-21.

---

# (2026-08-21) Estado original

Objetivo pedido por el usuario:
1. Ubicar dónde corre Webby con aapp.pro. **HECHO** (ver abajo).
2. Una **sección independiente del menú** para conectar Claude vía MCP de forma simple (login fácil).
3. Ampliar permisos del conector para: editar sitios, crear proyectos a clientes y propios,
   editarlos/configurarlos, editar y crear código, crear/editar bases de datos de los usuarios y
   de todos los sitios, usar el file manager completo, crear sitios profesionales sin plantillas,
   y crear + publicar proyectos vía prompts.

---

## 1. Dónde está (confirmado)

- **App**: Webby, Laravel 12 + Inertia/React, código fuente en `/opt/webby/Install`
- **Contenedor**: `webby-app` (imagen `webby-webby`), compose en `/opt/webby/docker-compose.yml`
- **DB**: contenedor `webby-mysql` (MySQL 8.0), db `webby`, root pass `root_secret_2024`
- **Proxy**: Traefik (`/docker/traefik-3smf`), router `Host(aapp.pro)` prioridad 200
- **Alias**: `aapp.host` (prioridad 100 la sirve `aapphost-app`, que NUNCA recibe tráfico — señuelo)
- `.env` de runtime: `/opt/webby/.env.runtime` (bind mount)
- **Ojo**: `/var/www/html` del contenedor es copia horneada en la imagen, NO un mount vivo.
  Solo ~6 archivos están bind-mounted (ver `volumes:` del compose).
  Para desplegar: `docker compose build webby && docker compose up -d webby`
  → esto despliega TODO el árbol (`git status` muestra ~147 archivos modificados preexistentes,
  que ya están dentro de la imagen actual porque se reconstruyó el 2026-08-20).
  Alternativa de bajo riesgo por archivo: `docker cp <host> webby-app:/var/www/html/<ruta>`

## 2. Lo que YA existía antes de esta sesión (fases 1-4, 2026-08-20)

- Servidor MCP **admin**: `POST /api/mcp/admin`, auth Sanctum (`role=admin`), 18 tools.
- Servidor MCP **proyecto**: `POST /api/mcp/project/{project}`, token de conector, 13 tools.
- Registro central: `Install/app/Providers/McpServiceProvider.php`
- Base de tool: `Install/app/Services/Mcp/McpTool.php` (name/description/inputSchema/requiredAbility/handle)
- Dispatcher JSON-RPC: `Install/app/Http/Controllers/Api/Mcp/McpController.php` (+ Admin/Project)
- Auditoría: tabla `mcp_tool_calls` + `App\Services\Mcp\McpAuditLogger` (loguea TODA llamada)
- Rate limit: `mcp-admin` 120/min, `mcp-project` 60/min
- UI admin existente: `/admin/ai-connector` y `/admin/api-tokens` (ambas bajo "Administration")
- UI cliente existente: pestaña "AI Connector" en Project Settings

Abilities actuales en `Install/app/Http/Controllers/Admin/AdminApiTokenController.php::ABILITIES`:
`users:read, users:write, users:impersonate, projects:read, projects:write, plans:read,
plans:write, transactions:read, transactions:write, subscriptions:read, subscriptions:write,
ai-providers:write, connectors:manage, database:execute`

---

## 3. HECHO en esta sesión (archivos ya escritos en /opt/webby/Install, lint OK, SIN desplegar)

### Servicio nuevo
- `app/Services/Database/DatabaseAdminService.php` — primitivas de BD reutilizables:
  conexiones (list/resolve/candidates), introspección (tableNames/tables/columnsFor/primaryKeysFor/
  singlePrimaryKey), filas (rows/insertRow/updateRow/deleteRow), esquema (createTable/renameTable/
  dropTable/addColumn/dropColumn), guardas (isProtectedTable/assertSchemaMutationAllowed/
  assertRowMutationAllowed/identifier/wrap/sqlType/sanitizeValues).
  Lanza `RuntimeException` (no abort HTTP) para que las tools lo conviertan en error de tool.
  **NO se tocó `DatabaseCrudController`** (superficie viva del UI /database). La política de tablas
  protegidas se mantiene única vía `config('database.editor_protected_tables')`.

### Trait compartido
- `app/Services/Mcp/Concerns/ResolvesAdminTargets.php` — `resolveProject()` (acepta id **o subdominio**),
  `resolveOwner()` (user_id / user_email / admin llamante), `tokenCan()` (chequear ability extra
  dentro de una tool), `projectSummary()`, `publicUrl()`.

### Tools nuevas creadas (en `app/Services/Mcp/Tools/Admin/`)
Proyectos:
- `AdminProjectsCreateTool.php` → `admin_projects_create` (ability `projects:create`)
  Crea proyecto para cualquier usuario o para el admin; acepta `files` (mapa path=>contenido) para
  sembrar el sitio SIN plantilla; `publish`+`subdomain` para publicar en la misma llamada;
  `respect_plan_limits` (default false = admin override). Rollback si ningún archivo se escribe.
- `AdminProjectsUpdateTool.php` → `admin_projects_update` (`projects:write`)
  name/description/custom_instructions/theme_preset/is_public/is_starred/published_*/transfer_to_user_id.
  Solo escribe las claves presentes.
- `AdminProjectsDeleteTool.php` → `admin_projects_delete` (`projects:delete`) trash/force+confirm/restore.
- `AdminProjectsPublishTool.php` → `admin_projects_publish` (`projects:publish`) publish/unpublish,
  subdominio autogenerado, waiver de plan salvo `respect_plan_limits=true`.

File manager:
- `AdminFilesListTool.php` → `admin_files_list` (`files:read`), filtro por `prefix`
- `AdminFilesReadTool.php` → `admin_files_read` (`files:read`), soporta `paths[]` múltiple
- `AdminFilesWriteTool.php` → `admin_files_write` (`files:write`), soporta `files` (mapa) multi-archivo
- `AdminFilesDeleteTool.php` → `admin_files_delete` (`files:delete`), soporta `paths[]`
- `AdminFilesRenameTool.php` → `admin_files_rename` (`files:write`)
- `AdminFilesMkdirTool.php` → `admin_files_mkdir` (`files:write`)

Todas pasan `php -l` (verificado con `docker exec -i webby-app sh -c 'cat > /tmp/l.php && php -l /tmp/l.php' < archivo`,
porque **no hay PHP en el host**).

---

## 4. PENDIENTE (lo que falta para terminar)

### A. Tools de base de datos (usar `DatabaseAdminService`, ya listo)
Crear en `app/Services/Mcp/Tools/Admin/`:
- `AdminDbConnectionsListTool` → `admin_db_connections_list` (`database:read`)
- `AdminDbTablesListTool` → `admin_db_tables_list` (`database:read`) — arg `with_columns`
- `AdminDbRowsListTool` → `admin_db_rows_list` (`database:read`) — page/per_page/where/bindings
- `AdminDbTableCreateTool` → `admin_db_table_create` (`database:schema`)
- `AdminDbTableRenameTool` → `admin_db_table_rename` (`database:schema`)
- `AdminDbTableDropTool` → `admin_db_table_drop` (`database:schema`) — exigir `confirm=true`
- `AdminDbColumnAddTool` / `AdminDbColumnDropTool` (`database:schema`)
- `AdminDbRowInsertTool` / `AdminDbRowUpdateTool` / `AdminDbRowDeleteTool` (`database:rows`)
Patrón: para tablas protegidas exigir `allow_protected`/`confirm_protected` **y** que el token
tenga la ability `database:protected` → chequear con `$this->tokenCan($context, 'database:protected')`
del trait antes de pasar el flag al servicio.

### B. Otras tools pendientes
- `AdminSettingsGetTool` / `AdminSettingsSetTool` (`settings:read` / `settings:write`) sobre `SystemSetting`
- `AdminUsersCreateTool` (`users:write`) — crear cliente
- `AdminCapabilitiesTool` (sin ability) — devuelve abilities del token + lista de tools + info de la
  plataforma. Sirve para que "loguearse" sea auto-descubrible desde Claude.
- (Opcional) `AdminProjectsDuplicateTool` (`projects:write`)

### C. Registrar TODAS las tools nuevas
En `app/Providers/McpServiceProvider.php`: añadir `use` + entrada en el array `$adminTools`.

### D. Ampliar abilities
En `AdminApiTokenController::ABILITIES` añadir:
`projects:create, projects:delete, projects:publish, files:read, files:write, files:delete,
database:read, database:schema, database:rows, database:protected, settings:read, settings:write`
(mantener las existentes). Actualizar también `RISKY_ABILITIES` en
`resources/js/Pages/Admin/ApiTokens/Index.tsx` para marcar `database:protected` y `projects:delete`.

### E. Desbloquear tablas protegidas en `AdminDatabaseQueryTool`
Hoy bloquea toda escritura sobre tablas protegidas. Añadir: si el token tiene `database:protected`
y el argumento `allow_protected=true`, permitir (y dejarlo bien logueado). Sin eso, seguir bloqueando.

### F. Sección INDEPENDIENTE del menú + página de conexión simple  ← lo más visible para el usuario
- Controlador nuevo: `app/Http/Controllers/Admin/McpConnectController.php`
  - `index()` → Inertia `McpConnect/Index` con: endpoint admin (`url('/api/mcp/admin')`), lista de
    tokens activos, catálogo de abilities, y últimas ~20 filas de `mcp_tool_calls`.
  - `connect()` → POST: emite en UN click un Sanctum token con **todas** las abilities
    (`$admin->createToken('Claude MCP', AdminApiTokenController::ABILITIES)`), devuelve el
    `plainTextToken` una sola vez.
  - `destroy()` → revocar.
- Rutas en `Install/routes/web.php` — **fuera** del grupo `admin/` prefix, como sección propia:
  ```php
  Route::middleware(['auth','admin'])->group(function () {
      Route::get('/mcp-connect', [McpConnectController::class, 'index'])->name('mcp-connect');
      Route::post('/mcp-connect/token', [McpConnectController::class, 'connect'])->name('mcp-connect.token');
      Route::delete('/mcp-connect/token/{token}', [McpConnectController::class, 'destroy'])->name('mcp-connect.token.destroy');
  });
  ```
- Página: `resources/js/Pages/McpConnect/Index.tsx`
  - Botón grande "Conectar con Claude" → un click, token con todos los permisos
  - Muestra el endpoint, el comando listo para pegar:
    `claude mcp add --transport http webby https://aapp.pro/api/mcp/admin --header "Authorization: Bearer <TOKEN>"`
  - JSON para Claude Desktop / conector claude.ai
  - Matriz de permisos concedidos
  - Tabla de conexiones activas con revocar
  - Últimas llamadas MCP (auditoría)
- Sidebar: `resources/js/components/Sidebar/AppSidebar.tsx`
  Añadir un `SidebarGroup` **independiente** (ni dentro de "Projects" ni de "Administration"),
  justo debajo del bloque "New Site", con el ítem "Claude MCP" → `/mcp-connect` (icono `Plug` o `Bot`,
  ya importados). Debe ser visible solo si `user.role === 'admin'`.

### G. Desplegar y verificar
1. `cd /opt/webby && git status --porcelain` — revisar que no haya sorpresas ajenas
2. Backup MySQL antes de nada:
   `docker exec -e MYSQL_PWD=root_secret_2024 webby-mysql mysqldump -u root webby > /opt/webby/backups/webby-$(date +%F-%H%M).sql`
   (usar `MYSQL_PWD` env, NUNCA `-p'...'` inline)
3. `docker compose build webby && docker compose up -d webby`
4. **No hay migraciones nuevas** — nada que migrar.
5. Verificar: `curl` a `/api/mcp/admin` con `initialize` y `tools/list` usando un token emitido,
   y probar el ciclo real: crear proyecto con `files` → publicar → leer archivo → borrar.
6. Verificar que el UI `/database` sigue funcionando (no se tocó, pero comprobar).

---

## 5. Decisiones tomadas (y por qué)

- **"Crear y publicar vía prompts" se implementa como: Claude genera el código y lo escribe**
  (`admin_projects_create` con `files`, o `admin_files_write` multi-archivo + `admin_projects_publish`),
  NO disparando el builder de IA de la plataforma. Razón: `BuilderProxyController::startBuild()` es un
  flujo con estado, websockets/broadcast y consumo de créditos, largo — no encaja en una llamada MCP
  síncrona. Además así se cumple "sitios profesionales sin basarse en plantillas".
  Si más adelante se quiere el otro camino, haría falta semántica asíncrona (job + polling de estado).
- **No se refactorizó `DatabaseCrudController`** para evitar romper el UI /database en producción;
  la lógica nueva vive en `DatabaseAdminService` y comparten política de tablas protegidas vía config.
- **PayPal para el módulo conector sigue sin cablear** (decisión previa, sin cambios).

## 6. AVISO de seguridad que hay que darle al usuario

Un token emitido desde la página "Conectar con Claude" con TODAS las abilities equivale a una sesión
de superadmin: puede editar cualquier sitio de cualquier cliente, tocar tablas de sistema
(`users`, `transactions`, `subscriptions`) si se concede `database:protected`, y borrar proyectos.
Debe guardarse como una credencial crítica y revocarse desde la misma página si se filtra.
Toda llamada queda en `mcp_tool_calls`.
