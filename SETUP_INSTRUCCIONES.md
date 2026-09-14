# 📋 Instrucciones para Visualizar los Cambios Realizados

## 🔍 Diagnóstico del Problema

Se realizaron cambios en el código y compilación, pero faltaba información de configuración para servir la aplicación correctamente. Aquí está todo lo necesario.

---

## 🚀 Cómo Acceder a la Aplicación

### URL Principal
La aplicación está corriendo en Docker en:
```
http://localhost:3100
```

**NO USES `http://localhost:5173`** - ese es solo el servidor de desarrollo de Vite (assets)

---

## 📦 Cambios Realizados

### 1. ✅ Logo Actualizado
**Archivo:** `/opt/webby/Install/resources/js/components/ApplicationLogo.tsx`

**Cambios:**
- Icono cambiado de `Paintbrush` a `Sparkles` (más acorde a un sistema de AI/Builder)
- Cuando no hay logo cargado, muestra "AAPP.HOST" en lugar del nombre del sitio

**Comportamiento:**
- Si existe un logo en las configuraciones: muestra la imagen
- Si NO existe logo: muestra el icono Sparkles + texto "AAPP.HOST"

---

### 2. ✅ Landing Page Traducida al Español de Argentina
**Archivo:** `/opt/webby/Install/lang/es_AR/landing.json`

**Traducciones aplicadas:**
```
Presioná        → en lugar de "Pulsa"
Describí        → en lugar de "Describe"
Empezá          → en lugar de "Empieza"
Mirá            → en lugar de "Mira"
Podés           → en lugar de "Puedes"
Sos             → en lugar de "Eres"
Contactá        → en lugar de "Contacta"
Entrar          → en lugar de "Ingresar"
Usá             → en lugar de "Usa"
Elegí           → en lugar de "Elige"
Lanzá           → en lugar de "Lanza"
Redujimos       → en lugar de "Hemos reducido"
```

Y muchas más expresiones argentinas naturales para toda la interfaz.

---

## 🎯 Pasos para Ver los Cambios

### Paso 1: Accede a la Aplicación
```bash
Abre en tu navegador: http://localhost:3100
```

### Paso 2: Verifica el Idioma
1. En la esquina superior derecha, busca el selector de idioma
2. Haz clic en él
3. Selecciona **"Español (Argentina)" o "es_AR"**

### Paso 3: Observa los Cambios
Deberías ver:

**En la Navbar:**
- Logo con icono "Sparkles" ✨ (si no hay logo cargado)
- Texto "AAPP.HOST" debajo del icono
- Todas las opciones de menú en español argentino

**En toda la landing page:**
- "Empezá" en lugar de "Empieza"
- "Describí lo que querés" en lugar de "Describe lo que quieres"
- "Mirá en acción" en lugar de "Mira en acción"
- Todos los botones y textos en español argentino

---

---

## ✅ Verificación de Cambios

Para confirmar que todo está funcionando:

```bash
# 1. Verifica que el build fue exitoso
cd /opt/webby/Install
npm run build
# Deberías ver: ✓ built in X.XXs

# 2. Verifica los archivos compilados
ls -la public/build/manifest.json

# 3. Verifica que el archivo de traducción es_AR existe
cat lang/es_AR/landing.json | head -5
```

### Si cambiaste código y no ves nada
Este despliegue empaqueta la app dentro de la imagen Docker.
Si modificaste PHP, React o TypeScript, reconstruí la imagen:
```bash
docker-compose up -d --build
```

---

## 🔄 Si los Cambios NO se Ven

### Opción 1: Limpiar Cache del Navegador
```
Presiona: Ctrl+Shift+Delete (Windows/Linux) o Cmd+Shift+Delete (Mac)
Selecciona: "Borrar datos de navegación"
Incluye: "Cookies y otros datos de sitios"
```

### Opción 2: Hard Refresh
```
Presiona: Ctrl+F5 (Windows/Linux) o Cmd+Shift+R (Mac)
```

### Opción 3: Reiniciar el Contenedor
```bash
docker-compose restart webby
```

---

## 📝 Resumen de Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `resources/js/components/ApplicationLogo.tsx` | Icono Paintbrush → Sparkles, fallback a "AAPP.HOST" |
| `resources/js/components/Project/BlankProjectPanel.tsx` | Agregado Eye a importaciones, size="xs" → size="sm" |
| `resources/js/hooks/useBuildCredits.ts` | Aceptar null como parámetro inicial |
| `resources/js/Pages/Chat.tsx` | Removido `)}` duplicado |
| `lang/es_AR/landing.json` | Traducción completa al español de Argentina |

---

## 🎨 Detalles Técnicos

### Logo Component
```tsx
// Si hay logo: muestra la imagen
if (logoUrl) {
    return <img src={logoUrl} />
}

// Si NO hay logo: muestra Sparkles + "AAPP.HOST"
return (
    <div>
        <Sparkles /> {/* Icono animado */}
        {showText && <span>AAPP.HOST</span>}
    </div>
)
```

### Sistema de Traducción
- Las traducciones se cargan desde `lang/es_AR/landing.json`
- Se aplican automáticamente cuando el usuario selecciona "Español (Argentina)"
- El contexto `LanguageContext` gestiona la carga de traducciones

---

## 📞 Próximos Pasos

Si necesitás más cambios:
1. Editá el archivo de traducciones: `lang/es_AR/landing.json`
2. Editá el componente del logo: `resources/js/components/ApplicationLogo.tsx`
3. Si tocaste código, reconstruí la imagen con `docker-compose up -d --build`
