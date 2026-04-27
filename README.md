# Webby — Documentación técnica y funcional

## 1) ¿Qué es esta aplicación?
Webby es una plataforma **SaaS para crear aplicaciones/webs con IA**. El usuario describe lo que quiere en un chat, Webby ejecuta un builder de IA, genera archivos del proyecto y permite:

- editar/publicar el proyecto,
- administrar archivos y base de datos,
- conectar dominios/subdominios,
- gestionar planes, suscripciones y créditos,
- operar todo desde un panel de administración.

La app principal vive en `Install/` (Laravel + Inertia + React/TypeScript), con un servicio builder externo que se integra por API/Webhooks.

---

## 2) Stack y arquitectura

### Backend
- **PHP 8.2+** y **Laravel 12**.
- Inertia (backend Laravel) para renderizar frontend React.
- Integraciones: Firestore/Firebase, Reverb/Pusher, Stripe/PayPal/Razorpay, Socialite, Sanctum, etc.

### Frontend
- **React 18 + TypeScript + Vite**.
- UI basada en Tailwind + componentes Radix.

### Arquitectura lógica (alto nivel)
1. Usuario crea/abre un proyecto.
2. Envía prompt al chat.
3. Backend valida permisos, plan, créditos y builder disponible.
4. Backend inicia sesión de build en el servicio builder.
5. El builder emite eventos por webhook (`status`, `thinking`, `tool_call`, `message`, `complete`, etc.).
6. Laravel reemite eventos en tiempo real a la UI y persiste historial/métricas.
7. El usuario visualiza preview, gestiona archivos, base de datos y publica.

---

## 3) Módulos principales

### 3.1 Instalación y upgrade
- Flujo guiado por pasos: requisitos, permisos, base de datos, admin y finalización.
- También existe flujo de upgrade con ruta dedicada.

Rutas relevantes:
- `/install/*`
- `/upgrade/*`

### 3.2 Landing, autenticación y arranque
- `/` sirve landing configurable desde base de datos.
- Si landing está desactivada, redirige a login o create según sesión.
- Soporta contenido dinámico/idioma para hero, sugerencias y prompts.

### 3.3 Creación de proyectos y chat IA
- `/create` para crear proyectos.
- `/project/{project}` para conversación con builder.
- Endpoint de envío de chat y sugerencias.

### 3.4 Gestión de proyectos
- Listado, duplicado, destacado, papelera, restauración y borrado permanente.
- Ajustes de proyecto (general, knowledge, theme, tokens API, miniaturas/share).

### 3.5 Publicación
- Publicación/despublicación por subdominio.
- Soporte de **dominio personalizado** con verificación e instrucciones DNS.

### 3.6 Archivos y almacenamiento
- File manager y archivos por proyecto.
- API pública para servir archivos del proyecto por UUID.
- API autenticada por token del proyecto para apps generadas.

### 3.7 Firebase/Firestore
- Configuración por proyecto de Firebase client/admin SDK.
- Generación de reglas y test de conexión.
- Endpoint para listar colecciones para el builder.

### 3.8 Facturación, créditos y referidos
- Planes, suscripciones, historial de facturas, uso de créditos de build.
- Módulo de referidos (tracking público + acciones autenticadas).

### 3.9 Administración
Panel `/admin` con:
- usuarios,
- suscripciones/transacciones,
- planes,
- plugins,
- idiomas,
- cronjobs,
- settings generales,
- builders/proveedores IA,
- templates,
- constructor de landing.

### 3.10 Cumplimiento y cuenta
- Consentimiento de cookies.
- Exportación de datos (GDPR).
- Solicitud/cancelación de eliminación de cuenta.

---

## 4) ¿Cómo funciona internamente el flujo de build?

### 4.1 Inicio de sesión de build
`BuilderProxyController`:
- autoriza acceso al proyecto,
- bloquea builds concurrentes por usuario,
- valida créditos disponibles,
- resuelve archivos adjuntos,
- obtiene configuración de IA según plan/usuario,
- selecciona builder/template,
- enriquece prompt con contexto,
- inicia sesión remota y guarda estado (`build_status = building`, `build_session_id`, timestamps).

### 4.2 Recepción de eventos del builder
`/api/builder/webhook`:
- exige autenticación por `X-Server-Key`.
- recibe `event_type` + `data`.
- despacha eventos en tiempo real.
- persiste acciones/mensajes en historial de conversación.
- maneja evento de finalización y errores.

Esto mantiene sincronizados backend, realtime y UI de chat.

---

## 5) Rutas clave de referencia

### Web
- Instalación/upgrade: `/install/*`, `/upgrade/*`
- App: `/create`, `/projects`, `/project/{project}`
- Preview: `/preview/{project}/{path?}`
- Public app: `/app/{project}/{path?}`
- Billing: `/billing/*`
- Admin: `/admin/*`

### API
- Webhook builder: `POST /api/builder/webhook`
- Templates para builder: `GET /api/templates*`
- Firestore collections para builder
- Archivos públicos: `GET /api/files/{projectId}/{filename}`
- Archivos app (token proyecto): `/api/app/{projectId}/files*`

---

## 6) Tareas programadas (cron)
La app agenda tareas para:
- gestión de suscripciones,
- reset mensual de créditos,
- procesos GDPR,
- limpieza de proyectos/workspaces/logs,
- detección de sesiones stale,
- refresco de contenido interno IA,
- provisión SSL de dominios custom,
- limpieza demo mode.

Estas tareas están definidas en `routes/console.php`.

---

## 7) Estructura del repositorio
- `Install/`: aplicación principal (Laravel + frontend Inertia/React).
- `Builder/prebuilt/`: binarios builder precompilados por plataforma.
- `Documentation/`: documentación estática y capturas.

---

## 8) Puesta en marcha local (desarrollo)
Desde `Install/`:

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --force
npm install
npm run dev
```

Comandos útiles:

```bash
composer dev      # servidor + queue + logs + vite
npm run build     # build frontend
php artisan test  # tests backend
npm run test:run  # tests frontend
```

---

## 9) Variables y configuración
- `.env` se usa para bootstrap base (app/db/etc.).
- Gran parte de configuración operativa (email, integraciones, providers IA, broadcast, builders, etc.) se administra desde el **panel admin**.

---

## 10) Despliegue automatizado
`Install/autosetup.sh` prepara un servidor Ubuntu (instala PHP/Nginx/MySQL/Node, despliega app Laravel, configura SSL y credenciales). Está pensado para instalaciones VPS automatizadas.

---

## 11) Recomendaciones operativas
1. Configurar al menos un builder activo y un proveedor IA funcional.
2. Verificar broadcast/realtime para experiencia de chat fluida.
3. Revisar cron del sistema para que ejecute scheduler de Laravel.
4. Definir políticas de planes/créditos según consumo real.
5. Activar y probar flujo de backups (DB, storage, claves).

---

## 12) Resumen funcional
Webby combina:
- **orquestación de IA por chat**,
- **gestión de proyectos y publicación**,
- **facturación SaaS y administración completa**,
- **capacidades de extensibilidad** (plugins, idiomas, templates, builders).

Es una base robusta para un producto “AI app builder” multiusuario con control administrativo centralizado.

---

## 13) Seguridad
Se añadió una revisión específica de seguridad en `SECURITY_REVIEW.md` con:

- búsqueda de patrones típicos de malware/backdoors,
- revisión de controles en endpoints sensibles,
- estado de auditoría de dependencias,
- hashes SHA-256 de binarios precompilados.
