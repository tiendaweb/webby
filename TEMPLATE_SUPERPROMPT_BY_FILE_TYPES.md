# Superprompt para generar plantillas reutilizables por tipo de archivos

```text
Actúa como un arquitecto senior de plantillas para un creador de sitios web y aplicaciones.

Tu trabajo es diseñar una plantilla reutilizable, instalable y editable dentro de un constructor visual/híbrido. No generes una página suelta. Genera un paquete de plantilla pensado para reutilizarse en múltiples proyectos del mismo tipo, con un árbol de archivos claro y consistente.

Objetivo del proyecto:
{objetivo}

Tipo de proyecto:
{tipo_proyecto}

Audiencia:
{audiencia}

Tono de marca:
{tono}

Idioma:
{idioma}

Restricciones de plantilla:
- Debe poder instalarse como plantilla reutilizable.
- Debe ser fácil de editar manualmente.
- Debe funcionar bien en mobile, tablet y desktop.
- Debe mantener separación clara entre estructura, estilos, comportamiento y datos.
- No dependas de un solo archivo gigante salvo que el runtime lo requiera.
- Usa solo los tipos de archivo que correspondan al proyecto.
- La plantilla debe permitir cambiar contenido, secciones y estilos sin romper la base.
- Debe incluir estados vacíos, carga y error cuando aplique.
- Debe estar pensada para un constructor que pueda editar por código y por UI.

Quiero que diseñes la plantilla alrededor del tipo de archivos necesarios.

Selecciona y justifica el stack de archivos según el tipo de proyecto:
- HTML estático: `index.html`, `styles.css`, `main.js`
- React/Vite: `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/App.tsx`, `src/components/*`, `src/styles/*`
- PHP simple: `index.php`, `db.php`, `helpers.php`, `assets/*`, `template.json`
- PHP con API local: `index.php`, `api/*.php`, `db.php`, `bootstrap.php`, `template.json`
- JSON/config-driven: `template.json`, `content.json`, `schema.json`, `assets/*`
- Markdown/documentation-driven: `content/*.md`, `template.json`, `assets/*`

Necesito que construyas la plantilla con esta lógica:
1. Define el tipo de plantilla y el runtime objetivo.
2. Define el árbol de archivos exacto que debe instalarse.
3. Explica qué hace cada archivo.
4. Define qué archivos son editables por el usuario y cuáles son infraestructura.
5. Define qué archivos deben mantenerse como base reusable.
6. Define qué archivos se pueden duplicar o reemplazar según el caso.
7. Define qué archivos son obligatorios y cuáles opcionales.
8. Define cómo se conecta el contenido editable con el render.
9. Define qué datos viven en JSON, qué datos viven en código y qué datos viven en secciones.
10. Define cómo se adapta a otros proyectos del mismo tipo sin cambiar la arquitectura.

Entrega en este orden exacto:

A. Resumen de la plantilla
- Nombre
- Slug
- Tipo de proyecto
- Runtime objetivo
- Caso de uso principal
- Qué problema resuelve

B. Metadata de instalación
- id
- name
- description
- category
- tags
- target_project_types
- file_stack
- theme_preset sugerido
- nivel de densidad de contenido
- páginas incluidas

C. Árbol de archivos
Devuélvelo en formato de árbol, indicando:
- archivo
- propósito
- si es obligatorio u opcional
- si es editable por el usuario
- si pertenece a UI, datos, estilos, runtime o configuración

D. Estructura funcional
Para cada archivo principal:
- qué contiene
- qué parte es reutilizable
- qué parte cambia por proyecto
- qué dependencias tiene
- qué rompe si se elimina

E. Páginas y secciones
Para cada página:
- nombre
- propósito
- secciones incluidas
- prioridad
- si es obligatoria u opcional

F. Sistema visual
- paleta de colores
- tipografía
- espaciado
- bordes
- sombras
- botones
- cards
- estados hover/focus/active
- reglas de layout
- reglas responsive

G. Contenido inicial
- titulares
- subtítulos
- CTAs
- textos de apoyo
- microcopy
- placeholders

H. Reglas de edición
- qué archivos editar primero
- qué archivos no tocar sin cuidado
- qué bloques o componentes permanecen como base reusable
- qué se puede duplicar o eliminar

I. Adaptabilidad
Explica cómo esta plantilla se reutiliza para 3 proyectos diferentes del mismo tipo sin cambiar el árbol base de archivos.

J. Output final
Devuélveme el resultado en formato estructurado, listo para convertir en una plantilla instalable. Si hace falta, usa JSON o YAML para metadata y un listado claro para el resto. No expliques tu proceso. No repitas instrucciones. No pongas texto de relleno.
```

## Notas de uso

- Si el proyecto es estático, prioriza HTML/CSS/JS.
- Si el proyecto necesita interacción compleja, prioriza React/Vite.
- Si el proyecto necesita ejecución server-side simple, prioriza PHP con SQLite local.
- Si el proyecto depende de contenido editable sin mucha lógica, usa JSON como fuente de verdad.
- Si el proyecto requiere documentación o contenido editorial, usa Markdown como base.

## Ejemplos de categorías de plantilla

- SaaS landing
- Portfolio
- Agencia
- Restaurante
- Evento
- Curso online
- CRM liviano
- Catálogo de productos
- App de productividad
- Sitio institucional
