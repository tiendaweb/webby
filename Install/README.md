# Install/ — Aplicación Laravel

Esta carpeta contiene la aplicación principal de Webby, una plataforma SaaS para crear, administrar y publicar sitios web y apps con asistencia de IA.

Stack: **Laravel 12 + React 18 + TypeScript + Vite**

---

## Resumen detallado

Webby está pensada como una plataforma completa de creación y despliegue de proyectos web. El usuario puede crear un proyecto desde cero, conversar con un builder de IA, revisar los archivos generados, publicar el resultado y administrarlo desde una interfaz centralizada. La aplicación no se limita al generador: también incluye instalación guiada, panel de administración, facturación, créditos de uso, dominios personalizados, traducciones, automatizaciones y soporte para proyectos HTML estáticos.

En la práctica, la app cubre estos flujos:

- **Instalación y puesta en marcha**: asistente inicial, validación de requisitos, configuración de base de datos y creación del usuario administrador.
- **Creación asistida por IA**: chat con builder, sesiones de build, seguimiento de eventos en tiempo real y persistencia del historial de conversación.
- **Gestión de proyectos**: listado, duplicado, restauración, papelera, ajustes, archivos, previews y publicación.
- **Proyectos blank**: sitios HTML/CSS/JS estáticos que se suben por archivos sueltos o ZIP y luego se publican como cualquier otro proyecto.
- **Publicación y dominios**: subdominios, dominios personalizados, verificación DNS y provisión SSL.
- **Facturación y monetización**: planes, suscripciones, transacciones, créditos de build y referidos.
- **Administración centralizada**: usuarios, idiomas, plugins, proveedores de IA, landing, cronjobs, logs y parámetros globales.
- **Cumplimiento y soporte operativo**: exportación de datos, eliminación de cuenta, consentimiento de cookies y notificaciones.

La arquitectura combina backend Laravel con frontend Inertia/React. El backend coordina permisos, créditos, sesiones de builder, persistencia y eventos. El frontend muestra el estado del proyecto, permite interactuar con el builder y administra configuraciones desde vistas React con TypeScript.

---

## Qué hace la aplicación

La aplicación permite:

1. Crear un proyecto nuevo desde una idea o desde una plantilla base.
2. Pedir cambios a un builder de IA mediante chat.
3. Recibir actualizaciones de progreso, errores, mensajes y acciones del builder en tiempo real.
4. Revisar, editar y publicar el proyecto.
5. Usar dominios propios o subdominios del sistema.
6. Gestionar planes, suscripciones, pagos y créditos.
7. Operar todo el sistema desde un panel admin.

---

## Requisitos

- **PHP 8.2+** con extensiones: `curl`, `dom`, `fileinfo`, `filter`, `gd`, `hash`, `json`, `mbstring`, `openssl`, `pcre`, `tokenizer`, `xml`, `zip`
- **Composer** (dependencias PHP)
- **Node.js 18+** y **npm** (dependencias frontend)
- **MySQL 5.7+** o **PostgreSQL 12+** (base de datos)
- **Redis** (cache y queue, opcional pero recomendado)

---

## Configuración inicial

### 1. Variables de entorno

Copiá `.env.example` a `.env`:

```bash
cp .env.example .env
```

Editá `.env` según tu entorno (BD, correo, secrets, etc.). Las claves más importantes:

```env
APP_NAME=Webby
APP_ENV=production      # o "local" para desarrollo
APP_DEBUG=false
APP_URL=https://ejemplo.com  # URL base

DB_CONNECTION=mysql     # o "pgsql"
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=webby
DB_USERNAME=webby
DB_PASSWORD=secret

MAIL_DRIVER=smtp        # configurar según tu proveedor
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
```

### 2. Instalar dependencias

```bash
# Backend
composer install

# Frontend
npm install
```

### 3. Generar claves y migraciones

```bash
# Generar APP_KEY
php artisan key:generate

# Ejecutar migraciones (crear tablas)
php artisan migrate

# (Opcional) Seed de datos iniciales
php artisan db:seed
```

### 4. Compilar assets frontend

```bash
# Desarrollo con watch
npm run dev

# Producción (minificado)
npm run build
```

### 5. Limpiar cache y preparar

```bash
php artisan cache:clear
php artisan config:clear
php artisan storage:link  # enlace simbólico storage/app/public → public/storage
```

---

## Estructura de directorios

```
Install/
├── app/                      # Código PHP
│   ├── Http/Controllers/     # Controladores de rutas
│   ├── Models/               # Modelos Eloquent
│   ├── Services/             # Servicios de negocio
│   └── Console/Commands/     # Comandos artisan
│
├── config/                   # Configuración Laravel
│
├── database/
│   ├── migrations/           # Migraciones de BD
│   ├── seeders/              # Seeds de datos
│   └── factories/            # Factories para tests
│
├── lang/                     # Archivos de idioma (JSON)
│   ├── en/
│   ├── es/
│   ├── es_AR/               # Español argentino (nuevo)
│   └── ...otros idiomas
│
├── resources/
│   ├── js/                  # React + TypeScript
│   │   ├── Pages/           # Página principales (Inertia)
│   │   ├── components/      # Componentes reutilizables
│   │   ├── hooks/           # React custom hooks
│   │   ├── types/           # Tipos TypeScript
│   │   └── contexts/        # React context (LanguageContext, etc.)
│   │
│   ├── views/               # Vistas Blade (pocas, mayormente Inertia)
│   └── css/
│
├── routes/
│   ├── web.php              # Rutas web (Inertia)
│   ├── api.php              # Rutas API (JSON)
│   └── console.php          # Comandos schedulados (cron)
│
├── storage/
│   └── app/                 # Archivos de usuario
│       ├── project-files/   # Archivos de proyectos blank
│       ├── previews/        # Previews generados
│       └── published/       # Proyectos publicados
│
├── tests/                   # Tests unitarios e integración
│
├── .env                     # Variables de entorno (no versionado)
├── .env.example             # Plantilla .env
├── composer.json            # Dependencias PHP
├── package.json             # Dependencias Node
├── vite.config.js           # Configuración Vite (assets)
├── tsconfig.json            # Configuración TypeScript
└── phpunit.xml              # Configuración tests PHP
```

---

## Migraciones

Las migraciones crean y modifican la estructura de BD. Ejecutá:

```bash
# Ver estado de migraciones
php artisan migrate:status

# Ejecutar migraciones pendientes
php artisan migrate

# Revertir última migración
php artisan migrate:rollback

# Revertir todo y volver a ejecutar
php artisan migrate:refresh --seed
```

### Migraciones importantes

- `2026_04_27_000001_add_type_to_projects_table.php` — Agrega campo `type` (ai/blank) a proyectos
  - Necesaria para soportar proyectos HTML estáticos

---

## Seeds (datos iniciales)

Los seeds pueblan la BD con datos de demostración:

```bash
# Ejecutar todos los seeds
php artisan db:seed

# Ejecutar un seed específico
php artisan db:seed --class=LanguageSeeder

# Al hacer migrate:refresh, se ejecutan automáticamente
php artisan migrate:refresh --seed
```

---

## Idiomas y localización

### Estructura de idiomas

```
lang/
├── en/          # English (idioma fuente)
│   ├── admin.json
│   ├── auth.json
│   ├── chat.json
│   └── ...17 archivos
│
├── es/          # Spanish (castilla genérica)
│   └── ...17 archivos
│
├── es_AR/       # Spanish (Argentina) — NUEVO
│   └── ...17 archivos (con voseo argentino)
│
└── ...otros idiomas
```

### Uso en código

**Backend (PHP):**
```php
use Illuminate\Support\Facades\Lang;

$message = __('auth.Sign in');  // traduce según locale actual
```

**Frontend (React/TypeScript):**
```typescript
import { useTranslation } from '@/contexts/LanguageContext';

function MyComponent() {
    const { t } = useTranslation();
    return <p>{t('auth:Sign in')}</p>;
}
```

### Cambiar idioma

El usuario selecciona idioma en el LanguageSelector. Internamente:
1. Frontend hace POST a `/locale` con `code` (ej: `es_AR`)
2. Backend guarda en sesión/BD
3. Frontend recarga con nuevas traducciones

---

## Proyectos Blank / Hosting Manual

Webby soporta proyectos sin IA para alojar sitios HTML, PHP y frontend compilado:

### Cómo funcionan

1. Usuario crea proyecto → `type = 'blank'`
2. Sube archivos HTML/CSS/JS/PHP, una app Vite React/TypeScript o un ZIP
3. Archivos se guardan en `storage/app/project-files/{id}/`
4. Preview se genera en `storage/app/previews/{id}/`  (sincronización o compilación manual con **Build App**)
5. Publicación copia a `storage/app/published/{id}/` y asigna subdominio

### Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/blank-project/create` | Crear proyecto blank |
| POST | `/api/blank-project/{id}/upload-files` | Subir archivos individuales |
| POST | `/api/blank-project/{id}/upload-zip` | Subir ZIP (extrae estructura) |
| GET | `/api/blank-project/{id}/files` | Listar archivos |
| POST | `/api/blank-project/{id}/preview` | Generar/actualizar preview |
| POST | `/api/blank-project/{id}/publish` | Publicar a subdominio |
| POST | `/builder/projects/{id}/build` | Compilar/sincronizar proyecto manual sin builder IA |

### Controlador

`app/Http/Controllers/BlankProjectController.php` maneja toda la lógica. Características:

- Auto-sincronización a preview tras upload
- Compilación de apps Vite React/TypeScript a salida estática, sin iniciar IA
- Copia recursiva de archivos y subdirectorios (ZIP)
- Dominio dinámico via `SystemSetting::get('domain_base_domain')`
- Método `duplicate()` copia archivos entre proyectos

React/TypeScript es viable cuando se entrega como SPA compilable a estático. No se ejecuta un servidor Node.js persistente ni SSR dentro del hosting manual.

---

## Tests

### Correr tests backend (PHPUnit)

```bash
php artisan test

# Con coverage
php artisan test --coverage

# Un archivo específico
php artisan test tests/Feature/ChatTest.php

# Una clase específica
php artisan test --filter=ChatTest
```

### Correr tests frontend (Vitest)

```bash
npm run test      # modo watch
npm run test:run  # una pasada
```

---

## Desarrollo local

### Iniciar servidor

```bash
# Opción 1: Artisan (simple)
php artisan serve

# Opción 2: Valet (recomendado en Mac/Linux)
valet link webby.local
# Accedé a http://webby.local

# Opción 3: Docker
docker-compose up -d
```

### Compilar assets en vivo

```bash
npm run dev
```

Abre otra terminal y ejecutá el servidor. Vite recompilará automáticamente React/TypeScript al editrar.

### Debugging

**Backend:**
- Usa `Log::debug()` en controladores: `Log::debug('message', ['data' => $var]);`
- Revisa `storage/logs/laravel.log`
- `dd($variable)` para detener y dumpar

**Frontend:**
- Abre DevTools del navegador (F12)
- Usa `console.log()` en React
- Vite mantiene source maps para debugging

---

## Troubleshooting

### Error: "Target [App\Models\Project] is not instantiable"
```bash
php artisan cache:clear
composer dump-autoload
```

### Error: "SQLSTATE[HY000]: General error: 1030"
Base de datos llena. Limpiá logs/cache:
```bash
php artisan cache:clear
php artisan tinker
>>> Cache::flush();
>>> exit;
```

### Assets no se actualizan
Reconstruí:
```bash
npm run build
php artisan cache:clear
```

### Cambios en el código no se reflejan dentro de Docker
Este despliegue copia `Install/` dentro de la imagen en build time.
Si editás código PHP, React o TypeScript en el repositorio, reconstruí la imagen:
```bash
docker-compose up -d --build
```

### Proyectos blank no muestran archivos
Verificá:
```bash
ls storage/app/project-files/{id}/   # archivos subidos
ls storage/app/previews/{id}/         # preview generado
php artisan migrate:status            # migración add_type aplicada
```

---

## Despliegue

### Producción (simplified)

```bash
# 1. Cloná/actualizá código
git pull origin main

# 2. Instalar dependencias
composer install --no-dev --optimize-autoloader
npm ci --production

# 3. Compilar assets
npm run build

# 4. Migraciones
php artisan migrate --force

# 5. Cache
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 6. Reiniciar servicios (supervisor para queue)
sudo systemctl restart php-fpm
sudo systemctl restart supervisor  # si usás queue
```

---

## Más información

- [Documentación Laravel](https://laravel.com/docs)
- [Documentación React](https://react.dev)
- [Plan de implementación del proyecto](https://../../plans/traduce-la-aplicacion-por-fancy-plum.md)
