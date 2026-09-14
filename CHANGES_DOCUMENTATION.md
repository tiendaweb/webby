# Cambios Implementados

## 1. Editor de Idiomas (Language File Editor)
**Ubicación:** `/opt/webby/Install/resources/js/Pages/Admin/Languages/`

### Funcionalidades:
- **EditFiles.tsx**: Editor completo de archivos de traducción con:
  - Selección de archivo de idioma mediante tabs
  - Búsqueda en tiempo real (keys y valores)
  - Editor inline para traducción de cada key
  - Guardado de cambios con confirmación visual
  - Soporte para múltiples idiomas

- **Index.tsx**: Gestión completa de idiomas con:
  - Listado de idiomas disponibles
  - Banderas de país
  - Estado RTL/LTR
  - Activar/desactivar idioma
  - Establecer idioma por defecto
  - Editor integrado de archivos de traducción
  - Crear, editar y eliminar idiomas
  - Soporte para más de 240 países

### Tipos TypeScript:
- `ColorTheme`: Temas de color disponibles
- `GeneralSettings`, `AuthSettings`, `EmailSettings`, etc.
- Validación completa de tipos

## 2. Creador de Webs Estáticas (Blank Project Creator)
**Ubicación:** `/opt/webby/Install/app/Http/Controllers/BlankProjectController.php`

### Funcionalidades:
- **Crear proyecto en blanco**: Proyectos sin dependencia de IA para hosting estático
- **Subir archivos**: Upload de archivos HTML/CSS/JS individuales (max 10MB cada uno)
- **Subir ZIP**: Importar sitio web completo desde archivo ZIP (max 100MB)
- **Gestionar archivos**: Listado y organización de archivos del proyecto
- **Preview**: Generar vista previa antes de publicar
- **Publicación**: Publicar a subdominio personalizado (ej: `misitioweb.aapp.host`)

### Características:
- Validación de archivos por tipo MIME
- Indexación automática de archivos
- Checksums SHA256 para integridad
- Template HTML5 predeterminado
- Soporte para metadatos de proyecto

## 3. Modificaciones en la Base de Datos
**Ubicación:** `/opt/webby/Install/database/migrations/`

- Nueva migración: `2026_04_27_000001_add_type_to_projects_table.php`
- Añade campo `type` a tabla `projects` para diferenciar proyectos IA de estáticos

## 4. Configuración Docker
**Nuevos archivos:**
- `Dockerfile`: Compilación completa con Node.js y PHP-FPM
- `docker-compose.yml`: Orquestación de servicios
- `docker/`: Configuración de Nginx, Supervisor, PHP-FPM

## Despliegue y Compilación

El proyecto usa **Docker en modo producción**, lo que requiere compilación:

### Proceso Completado ✅

1. **Recompilación de imagen Docker**
   ```bash
   docker compose build --no-cache
   ```
   - Instaló dependencias npm (`npm install`)
   - Compiló assets React (`npm run build`)
   - Generó archivos estáticos optimizados en `public/build/assets/`

2. **Inicio de contenedores**
   ```bash
   docker compose up -d
   ```
   - Contenedor `webby-app`: esperado en el servicio `webby`
   - Contenedor `webby-mysql`: esperado en el servicio `webby-mysql`
   - Servicios activos:
     - nginx (servidor web)
     - php-fpm (intérprete PHP)
     - scheduler (tareas programadas)
     - queue (cola de trabajos)

### Assets Compilados

Los siguientes componentes están compilados y disponibles:
- `LanguageSelector-CDxHmZX9.js` (Editor de idiomas)
- `Edit-Cg51yuPl.js` (Edición de archivos)
- `ProjectSettingsPanel--GTnJInp.js` (Configuración de proyectos)
- Más de 40 componentes compilados en `public/build/assets/`

### Ubicación en el Sistema

- **URL de acceso**: http://localhost:3100 en el entorno Docker local
- **Contenedor**: `webby-app` (PHP-FPM + Nginx)
- **Ruta de la aplicación**: `/var/www/html`
- **Assets compilados**: `/var/www/html/public/build/assets/`

### Solución de Problemas - 502 Bad Gateway

**Problema encontrado:**
- Error: "upstream sent too big header while reading response header from upstream"
- Causa: Los headers PHP eran demasiado grandes para los buffers predeterminados de Nginx

**Solución aplicada:**
Aumentados los buffers de FastCGI en `/opt/webby/docker/nginx.conf`:
```nginx
fastcgi_buffer_size 128k;
fastcgi_buffers 4 256k;
fastcgi_busy_buffers_size 256k;
fastcgi_max_temp_file_size 0;
fastcgi_read_timeout 300s;
```

**Estado:** La configuración de Nginx está alineada para Docker; para ver cambios de código hay que reconstruir la imagen.

### Próximas Acciones

Para ver cambios de código:
1. Reconstruí la imagen con `docker-compose up -d --build`
2. Abrí `http://localhost:3100`
3. Hacé hard refresh si el navegador cacheó una versión anterior

Los cambios administrables son visibles en:
1. **Panel de Administración → Idiomas**
   - Crear/editar/eliminar idiomas
   - Editor de archivos de traducción

2. **Panel de Proyectos**
   - Opción para crear proyecto en blanco (sin IA)
   - Subir archivos/ZIP
   - Preview y publicación
