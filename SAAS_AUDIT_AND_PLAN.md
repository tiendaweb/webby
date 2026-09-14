# Webby SaaS Audit and Change Plan

## 1. Current state

Webby is structurally viable as an AI website builder SaaS. The core flows work:
- project creation and template recommendation,
- AI chat and build orchestration,
- preview, inspect, code, structure, history and settings,
- publishing via subdomain/custom domain,
- admin controls, billing, credits and plans,
- database tooling for SQL, project collections and Firebase.

The platform is not missing a single big feature. The remaining work is mostly product coherence, data-model clarity and long-term scalability.

## 2. Audit by priority

### Level 1: fix now
- Make “Data” a single story in the UI. Keep SQL global, project collections and Firebase, but present them as one platform with clear subtypes.
- Make project collections feel like a real builder, not a generic SQLite wrapper.
- Keep the editor navigation readable: source of truth, derived views, and actions need a clearer hierarchy.
- Surface connection/config errors inline, not only as toasts.

### Level 2: improve next
- Add typed fields, relations, views and filters to project data.
- Expose a stable read API for generated sites so pages can consume project data cleanly.
- Add data versioning and restore, not just file/structure history.
- Expand integration tests around data, publishing and editor navigation.

### Level 3: plan for scale
- Introduce a unified “Data Sources” model across SQLite, SQL and Firebase.
- Add permissions, auditing, backup/export and import for data sources.
- Separate site-first, app-first and data-first project modes more explicitly.
- Add observability for build failures, publish failures and data connection failures.

## 3. Change plan

- Align UI labels around `Project Data`, `Collections` and `Data Sources`.
- Keep SQL global admin tooling separate from project-scoped data management.
- Evolve project collections into a Notion-style builder with multiple CRUD tables per project.
- Keep code editing and visual editing available in parallel; do not merge them into one editor.
- Preserve Firebase support as a first-class project-scoped source.

## 4. Assumptions

- SQLite collections remain the default implementation for project-scoped structured data.
- SQL global admin tooling remains for installation-level maintenance, not for project content.
- Firebase stays available for projects/plans that enable it.
- The next product step is semantic unification, not another isolated editor.
