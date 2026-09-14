# Plan: Soporte PHP + Plantilla Todo List PHP para Webby

## Contexto

Webby es una plataforma SaaS de construcción de aplicaciones web con IA. Actualmente:
- **React/TypeScript**: Soporte completo (IA genera el código vía builder binario en Go)
- **PHP**: Runtime ejecuta PHP via CLI subprocess, pero NO hay plantillas PHP ni soporte de generación por IA
- **No existe** ninguna plantilla de tipo "Todo List" (ni React ni PHP)

El objetivo es:
1. Hacer viable la creación de aplicaciones PHP dentro del sistema de plantillas
2. Crear una plantilla PHP Todo List funcional (y la React equivalente como referencia)
3. Registrar ambas plantillas en el seeder y sistema de administración

**Limitación clave**: El builder binario (Go) no puede modificarse para generar PHP — pero el sistema de plantillas "blank" + runtime PHP ya están listos para soportar apps PHP completas.

---

## Arquitectura de Plantillas (referencia)

- ZIP se guarda en: `Install/storage/app/private/templates/{slug}-template.zip`
- Modelo: `Install/app/Models/Template.php`
- Seeder: `Install/database/seeders/TemplateSeeder.php`
- Runtime PHP: `Install/app/Http/Controllers/PreviewController.php:92-165`
  - Ejecuta `php -d auto_prepend_file=<bootstrap> index.php` en el directorio del proyecto
  - Bootstrap inyecta `$_SERVER`, `$_GET`, `$_POST`, `$_COOKIE` y `$body` (raw input)
  - Timeout: 5 segundos por request
  - Requiere `enable_php_runtime` en el plan del usuario

---

## Pasos de Implementación

### Paso 1 — Crear estructura de la app PHP Todo List

**Archivos en ZIP:**
```
php-todo/
├── index.php          ← router principal + HTML + API JSON
├── db.php             ← helper PDO/SQLite
├── template.json      ← metadata para Webby
└── README.md          ← instrucciones de uso
```

**`template.json`** metadata:
```json
{
  "id": "php-todo",
  "language": "PHP",
  "runtime": "php",
  "framework": "Vanilla PHP",
  "database": "SQLite",
  "type": "blank"
}
```

**Archivo creado**: `Install/storage/app/private/templates/php-todo-template.zip`

---

### Paso 2 — Crear estructura de la app React Todo List (referencia)

**Archivos en ZIP:**
```
react-todo/
├── template.json
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   └── components/
│       ├── TodoList.tsx
│       ├── TodoItem.tsx
│       └── AddTodo.tsx
```

**Archivo creado**: `Install/storage/app/private/templates/react-todo-template.zip`

---

### Paso 3 — Registrar plantillas en el Seeder

**Archivo modificado**: `Install/database/seeders/TemplateSeeder.php`

---

## Viabilidad PHP en Webby — Resumen

| Aspecto | Estado actual | Acción requerida |
|---------|---------------|------------------|
| Runtime PHP (ejecución) | ✅ Funcional | Ninguna |
| Extensión .php permitida | ✅ En ALLOWED_EXTENSIONS | Ninguna |
| PDO/SQLite en PHP CLI | ✅ Disponible | Ninguna |
| Plantillas PHP | ✅ Creadas | Hecho |
| Generación IA de PHP | ❌ Builder solo React | Fuera de alcance (binario cerrado) |
| Plan con PHP runtime | ✅ `enable_php_runtime=true` por defecto | Ninguna |

---

## Verificación

1. `cd Install && php artisan db:seed --class=TemplateSeeder`
2. Verificar que las plantillas aparecen en `/admin/ai-templates`
3. Crear proyecto blank → seleccionar "PHP Todo List"
4. Abrir preview → verificar que renderiza la UI de tareas
5. Agregar, completar y eliminar tareas → verificar persistencia SQLite
6. Verificar que `/api/todos` responde JSON correcto
