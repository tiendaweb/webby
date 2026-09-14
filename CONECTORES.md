# Conectores MCP de Webby (aapp.pro) — Claude · ChatGPT · Grok

Última actualización: 2026-08-27.

## Qué hay

Dos servidores MCP (JSON-RPC 2.0 sobre Streamable HTTP):

| Servidor | Endpoint | Alcance | Credencial |
|---|---|---|---|
| **Admin** | `POST https://aapp.pro/api/mcp/admin` | Toda la plataforma: 40 herramientas | Token Sanctum de un usuario `role=admin` |
| **Proyecto** | `POST https://aapp.pro/api/mcp/project/{PROJECT_ID}` | Un solo sitio: 13 herramientas | Token de conector del proyecto (hasheado), requiere el módulo «Conector IA» activo |

Cada servidor se expone de **tres formas**:

1. **OAuth 2.1 (recomendado)** — `POST /api/mcp/admin`, sin nada pegado.
   Lo que se pega en Claude / ChatGPT / Grok es la URL pelada: **no lleva ningún secreto**, así que
   se puede mandar por chat sin regalar el acceso. El cliente descubre solo cómo autenticarse
   (ver abajo), te manda al navegador a iniciar sesión y aprobar, y después renueva su token solo.
2. **Cabecera** — `POST /api/mcp/admin` + `Authorization: Bearer <TOKEN>`
   La usan Claude Code, Claude Desktop (vía `mcp-remote`), VS Code/JetBrains, el MCP Inspector,
   curl y cualquier código propio.
3. **Token en la URL** — `POST /api/mcp/admin/k/<TOKEN>`
   Para cuando no se puede completar un inicio de sesión en el navegador (un cliente headless, un
   script). **La URL es una contraseña**: se muestra una sola vez y se revoca desde `/connect`.

También responden `GET` (405, este servidor nunca hace push), `DELETE` (204) y `OPTIONS`
(preflight CORS, para clientes que corren dentro del navegador).

## OAuth 2.1 — cómo funciona

La cadena que sigue un conector, sin que el operador haga nada más que aprobar:

1. `POST /api/mcp/admin` sin credencial → **401** con
   `WWW-Authenticate: … resource_metadata="https://aapp.pro/.well-known/oauth-protected-resource"`.
2. `GET /.well-known/oauth-protected-resource` → dice qué servidor de autorización vale.
3. `GET /.well-known/oauth-authorization-server` → endpoints de registro, autorización y token.
4. `POST /api/oauth/register` → **registro dinámico** (RFC 7591). Es abierto a propósito: es lo
   único que Claude/ChatGPT/Grok saben hacer, y una fila de cliente **no da acceso a nada** — la
   decisión real pasa en el paso 5.
5. El navegador va a `https://aapp.pro/oauth/authorize` → **pantalla de consentimiento**. Ahí un
   administrador logueado ve qué aplicación pide, a dónde vuelve y exactamente qué permisos
   entrega, y aprueba o no.
6. `POST /api/oauth/token` con el código + PKCE (S256 obligatorio) → access token (24 h) +
   refresh token (90 días, **rotativo**).

Detalles que importan:
- El access token es un **token Sanctum normal**, con las mismas abilities: una conexión OAuth y
  una hecha a mano se autentican igual, se auditan igual y se revocan desde la misma tabla en
  `/connect`.
- Solo **administradores** pueden aprobar: el servidor admin es el único recurso detrás de este
  flujo, y un token aprobado por un cliente común fallaría en la primera llamada.
- Un `redirect_uri` no registrado o un `client_id` desconocido **no redirigen**: se muestra una
  página de error. Redirigir a una URI sin validar es exactamente cómo se filtran los códigos.
- Rotación: usar un refresh token lo quema y mata el access token que respaldaba.
- La pantalla de consentimiento envía con un **`<form method="POST">` nativo**, no con Inertia: al
  aprobar, la respuesta es un 302 al `redirect_uri` del cliente, y un XHR seguiría ese redirect él
  mismo → CORS lo bloquea y el flujo muere sin salir de la página.
- `approve` viaja en un **input oculto** (dos forms, uno por resultado), no como `name`/`value` del
  botón: el submitter solo se envía si el botón sigue habilitado cuando el navegador arma el form
  data, y eso pasa después del handler de submit. Si ahí se deshabilita el botón, el campo
  desaparece, la validación falla y Laravel redirige de vuelta — se ve como que la página se recarga
  sola al hacer clic (`POST 302` + `GET 200` sobre la misma URL en el access log).
- `POST /api/oauth/revoke` (RFC 7009) revoca cualquiera de los dos.
- nginx tenía `location ~ /\. { deny all; }`, que daba **403 en todo `/.well-known/`** y hacía
  imposible el descubrimiento. `docker/nginx.conf` ahora tiene una excepción `^~ /.well-known/`
  (el script de despliegue la vuelve a aplicar).

## Pantalla «Conectar asistentes»

En el menú lateral hay un grupo propio **«Conectores»** (visible solo para administradores) con las
tres pantallas de conexión, que antes estaban desparramadas:

- **Conectar asistentes** → `/connect`
- **Módulo Conector IA** → `/admin/ai-connector` (el módulo que activan los clientes para su sitio)
- **Tokens de conector** → `/admin/api-tokens`

`https://aapp.pro/connect` hace todo en un lugar:

- Elegís el cliente (Claude / Claude Code / ChatGPT / Grok / otro) y creás la conexión de un clic.
- Devuelve la URL de conexión, el token, el comando de Claude Code, el JSON de Claude Desktop,
  el `mcp.json` de VS Code y un `curl` de prueba, todos con botón de copiar.
- **Probar esta conexión** hace un `initialize` + `tools/list` real contra el endpoint desde el
  navegador, así un fallo aparece ahí con el error verdadero y no como un «no pude conectar»
  dentro de Claude.
- Permisos: por defecto los 26; se pueden acotar (hay un botón «solo el conjunto seguro» que
  descarta los destructivos).
- **Apps conectadas con OAuth**: las que se registraron solas y fueron aprobadas en la pantalla de
  consentimiento. Antes no se veían por ningún lado — se registran sin intervención humana, así que
  el único rastro era una fila en la base. La tarjeta trae la URL para copiar y los pasos exactos
  para Claude, ChatGPT y Grok al lado de la lista, y un botón para desconectar (revoca sus refresh
  tokens, los access tokens que respaldaban, y borra el registro).
- Lista de conexiones con token y revocar, conectores de sitios de clientes y las últimas 25
  llamadas MCP (auditoría).

Un cliente conecta **su propio sitio** desde *Configuración del proyecto → Conector IA*: el diálogo
del token ahora muestra también la URL de conexión lista para pegar en los tres productos.

## Cómo conectar (resumen)

### Claude
- **claude.ai (recomendado)** → Configuración → Conectores → Agregar conector personalizado →
  pegar `https://aapp.pro/api/mcp/admin`. Claude te manda a iniciar sesión y aprobar.
- **claude.ai sin iniciar sesión** → lo mismo, pero pegando la URL con el token adentro y dejando
  «sin autenticación».
- **Claude Desktop** → Configuración → Desarrollador → Editar config → pegar el JSON (usa
  `npx mcp-remote`, requiere Node.js).
- **Claude Code** → `claude mcp add --transport http webby https://aapp.pro/api/mcp/admin --header "Authorization: Bearer <TOKEN>"`, verificar con `/mcp`.

### ChatGPT
- Configuración → Conectores (modo desarrollador) → agregar servidor MCP → pegar
  `https://aapp.pro/api/mcp/admin` y elegir **OAuth**; ChatGPT se registra solo y te manda a
  aprobar. Si preferís no iniciar sesión, pegá la URL con el token y elegí «ninguna».
- Desde la API: herramienta `{"type":"mcp","server_label":"webby","server_url":"<URL>"}`.
- El servidor expone `search` y `fetch` con el contrato que ChatGPT espera, además del resto.

### Grok
- Configuración → Conectores → Agregar → pegar `https://aapp.pro/api/mcp/admin` (te manda a
  aprobar), o la URL con el token adentro si no querés iniciar sesión.
- Desde la API de xAI: igual, como herramienta MCP.

### Cualquier otro
- Streamable HTTP contra `/api/mcp/admin` con cabecera `Authorization`.
- `npx @modelcontextprotocol/inspector` con transporte «Streamable HTTP».

## Qué puede hacer el asistente conectado (servidor admin)

- **Crear sitios desde un prompt sin plantilla** — `admin_projects_create` con un mapa
  `files` (ruta => contenido); con `publish:true` los deja publicados en un subdominio en la
  misma llamada.
- **Subir un proyecto entero** — `admin_projects_import` con `zip_base64` (hasta 25 MB) o
  `zip_url` (solo http(s) público; se rechazan hosts privados).
- **Editar un detalle sin reescribir el archivo** — `admin_files_search` (grep sobre todo el
  proyecto: ruta + línea + texto) y `admin_files_edit` (find/replace literal o regex, aplicado en
  orden y **todo-o-nada**: si algún `find` no matchea, no se escribe nada). Soporta `dry_run`,
  `all=false` (exige que el match sea único) y `expected_occurrences` (falla si el conteo no es el
  esperado). Preferir esto sobre `admin_files_write`, que reemplaza el archivo entero y pierde lo
  que el modelo no reprodujo.
- **Bajar una imagen de una URL** — `admin_files_download` la trae a `assets/` (o a la ruta que
  indiques) y devuelve el path para referenciarla. Hasta 25 MB, solo http(s) público (se rechazan
  hosts privados) y solo tipos de archivo permitidos; si la URL no tiene extensión la deduce del
  content-type.
- **Editar en vivo (archivo completo)** — `admin_files_list/read/write/delete/rename/mkdir` sobre
  cualquier proyecto (`project_id` acepta el id o el subdominio).
- **Comprobar que compila** — `admin_projects_preview_build` reconstruye el preview y devuelve el
  error del compilador si falla.
- **Publicar / despublicar** — `admin_projects_publish`.
- **La base de datos propia de cada cliente (Firebase/Firestore)** —
  `admin_firebase_credentials_get` (a qué Firebase está enganchado el sitio, con chequeo de
  alcanzabilidad), `admin_firebase_credentials_set` (engancharle su **propio** proyecto de Firebase,
  o devolverlo al compartido), `admin_firestore_collections_list`,
  `admin_firestore_documents_list` (con filtros `where`, orden y paginado),
  `admin_firestore_document_get` y `admin_firestore_document_write` (create/update/delete).
  Abilities: `firestore:read` / `firestore:write`.
- **La base de datos de la plataforma (SQL)** — `admin_db_connections_list`, `admin_db_tables_list`,
  `admin_db_rows_list`, `admin_db_rows_write` (insert/update/delete), `admin_db_schema`
  (crear/renombrar/eliminar tablas, agregar/quitar columnas) y `admin_database_query` (una sentencia
  SQL, con guardas).
- **Clientes y facturación** — `admin_users_create/list/update/impersonate`, planes,
  transacciones, suscripciones.
- **Configuración de la plataforma** — `admin_settings_get/set` (los valores que parecen
  credenciales se devuelven enmascarados).
- **Notas del chat** — `admin_notes_list` (la cola de pedidos que el dueño dejó en el chat de un
  proyecto) y `admin_notes_respond` (contestarlas; la respuesta aparece en el chat donde iría la de
  la IA). Abilities `notes:read` / `notes:write`.
- **Descubrimiento** — `admin_capabilities` (qué permisos tiene este token y qué herramientas
  puede usar) y `search`/`fetch`.

## Notas en el chat para los conectores

En el chat de un proyecto de IA, el compositor ahora tiene **dos carriles**:

- **IA** (por defecto, sin cambios) — va al constructor de IA, gasta créditos, arranca sesión.
- **Nota** — se guarda en el hilo y **no se manda al constructor**. Es un pedido dirigido al
  asistente que esté conectado por MCP.

Una nota nace en `pending`. El conector la ve con `admin_notes_list` /`project_notes_list`
(status `pending` es la cola), puede tomarla (`*_notes_respond` con `status=in_progress` y sin
`content`), hacer el trabajo, y responder con `*_notes_respond`. **Esa respuesta es la que el dueño
lee en el chat, en el lugar donde normalmente aparecería la respuesta de la IA** — con el nombre
del conector que la escribió y, si mandó `data`, un bloque de detalle desplegable.

Estados: `pending`, `in_progress`, `done`, `failed`, `cancelled`. Desde la UI se puede cancelar una
nota (`PATCH /project/{id}/notes/{note}`).

**La garantía importante:** ni las notas ni las respuestas llegan nunca al modelo.
`Project::getHistoryForBuilder()` filtra a `user`/`assistant`, y lo mismo hace `getHistoryForApi()`
en el cliente — los roles `note` y `note_result` quedan afuera por construcción, no por una lista de
exclusión que haya que mantener. El camino de "mandar a la IA" no se tocó.

Abilities: `notes:read` / `notes:write` en el servidor admin; los mismos scopes en los tokens de
conector de proyecto. **Los tokens de proyecto emitidos antes del 2026-08-27 no los tienen** y hay
que reemitirlos desde la configuración del proyecto para usar las herramientas de notas.

La página hace polling cada 10 s mientras haya alguna nota abierta, así la respuesta del conector
aparece sola sin recargar.

## Editar desde el celular

El panel de trabajo (preview / código / diseño / ajustes) estaba con `display:none` en móvil, así
que desde un teléfono **no había forma de llegar al editor**. Ahora:

- Barra inferior (solo móvil) con Chat · Vista previa · Código · Ajustes, que alterna entre las dos
  columnas. En escritorio no aparece y el layout de dos columnas queda igual que antes.
- En la vista de código, el árbol de archivos y el editor **se turnan** en móvil: el árbol hasta que
  elegís un archivo, después el editor a pantalla completa con un botón «Archivos» para volver.
  (Antes eran 224 px de árbol al lado del editor: en un teléfono quedaban ~150 px de código.)
- La barra de modos del panel de trabajo no encoge sus botones, así que se puede desplazar en
  horizontal en pantallas angostas en vez de aplastarse.

## El preview es atómico (y los fallos se avisan)

El sitio publicado se sirve desde `previews/{id}/`, o sea desde el **build**. Antes `syncPreview()`
borraba ese directorio *antes* de compilar, así que **un TSX que no compilaba dejaba el sitio del
cliente en 404** hasta el próximo build bueno — y las herramientas de escritura devolvían
`success: true` sin mencionarlo, porque tragaban la excepción.

Ahora el build va a un directorio de staging y **solo reemplaza al vivo cuando terminó bien**. Si
falla, queda sirviéndose la última versión que compilaba y el error viaja como `preview_warning` en
la respuesta de `admin_files_write`, `admin_files_edit`, `admin_files_download`,
`admin_projects_create`, `admin_projects_publish` y los `import`. `admin_projects_preview_build` da
la respuesta directa a "¿está publicado lo que acabo de escribir, o la versión anterior?".

Verificado: rompí un TSX a propósito → la escritura devolvió `success:true` + `preview_warning` con
el error de Rollup, el sitio siguió en **HTTP 200 con el bundle anterior**, y una edición quirúrgica
lo reparó y publicó el bundle nuevo.

## La base de datos de cada cliente (Firestore)

Hay **dos arreglos posibles** por proyecto, y las herramientas esconden la diferencia:

1. **Firebase propio del cliente** — el proyecto tiene su propio service account
   (`projects.firebase_admin_service_account`, encriptado). Las rutas se usan tal cual: toda esa
   instancia de Firestore es del cliente, sin vecinos.
2. **Firebase compartido de la plataforma** — sin credenciales propias se usa el service account de
   la instalación y **cada ruta se fuerza bajo `projects/{id}/`**, el mismo prefijo que ya usan
   `Project::getFirebaseCollectionPrefix()` y las reglas de seguridad generadas.

En el arreglo compartido ese prefijo **es** toda la frontera entre clientes, por eso se aplica en un
solo lugar (`FirestoreDataService::scopePath()`, por el que pasa toda construcción de ruta) y no se
deja librado a que cada herramienta se acuerde. `..` y `.` se rechazan.

Detalles:
- Todo va por la **API REST de Firestore** (igual que `FirebaseAdminService`), así que no hace falta
  la extensión gRPC de PHP.
- Los valores se pasan como **JSON común** y se convierten solos (int, float, bool, null, listas,
  objetos anidados). Para los tipos que JSON no expresa se puede pasar el envoltorio de Firestore
  crudo, p. ej. `{"creado": {"timestampValue": "2026-08-27T00:00:00Z"}}`.
- `update` hace **merge** por defecto: el PATCH de Firestore reemplaza el documento entero si no se
  manda un `updateMask`, que es una forma muy fácil de borrarle los datos a un cliente creyendo que
  cambiabas un campo. `merge=false` es la manera explícita de pedir reemplazo.
- `delete` exige `confirm=true`.
- El cliente hace lo mismo sobre **su propio** sitio con las cuatro herramientas
  `project_firestore_*` del servidor de proyecto (scopes `firebase:read` / `firebase:write`); ahí el
  proyecto sale del token validado, nunca de un argumento.

**Ojo:** hoy esta instalación **no tiene ningún service account de Firebase cargado** — ni a nivel
plataforma ni en ningún proyecto (solo están las claves del SDK cliente `firebase_system_*`). Las
herramientas responden con un mensaje que lo explica en vez de fallar de forma rara. Para que sirvan
hay que cargar uno: el JSON del service account de la consola de Firebase, sea a nivel plataforma
(configuración del admin) o por proyecto con `admin_firebase_credentials_set` — que además verifica
las credenciales contra Firestore antes de guardarlas.

### Guardas
- Cada herramienta pide una *ability* concreta del token; sin ella la llamada falla con el
  mensaje que dice cuál falta.
- `drop_table` / `drop_column` / borrado forzado de proyecto exigen `confirm=true`.
- Las tablas del sistema (`users`, `transactions`, `subscriptions`, `personal_access_tokens`,
  `system_settings`, …) exigen **las dos cosas**: `allow_protected=true` en la llamada **y** la
  ability `database:protected` en el token. Una sola no alcanza.
- En Firestore compartido, ninguna ruta puede salir de `projects/{id}/`.
- Todas las llamadas quedan en `mcp_tool_calls` y se ven en `/connect`.

## Despliegue

El árbol fuente (`/opt/webby/Install`) es idéntico a la imagen en ejecución salvo estos cambios,
así que se despliegan archivo por archivo en vez de reconstruir la imagen (un rebuild vuelve a
correr `composer install` y `npm install` — no `ci` — y puede mover dependencias que hoy están
sanas en producción):

```bash
/opt/webby/deploy-mcp-connect.sh
```

**Volver a ejecutarlo después de cualquier `docker compose up -d` que recree `webby-app`**:
`docker cp` no sobrevive a la recreación del contenedor. Correrlo dos veces no hace daño.

El script copia los archivos PHP/lang y `public/build`, arregla permisos, hace
`php artisan optimize:clear` y recarga php-fpm.
