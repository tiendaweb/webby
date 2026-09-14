# Website Hosting Workspaces

Webby workspaces are now centered on hosting, live editing, previewing, and publishing websites. The primary project type is the manual hosted workspace (`type = blank`). AI remains optional: when a builder/provider is available, the assistant can edit the existing workspace files, but site creation and hosting must work without AI.

## Storage Layout

- Source files: `storage/app/project-files/{project_id}`
- Preview files: `storage/app/previews/{project_id}`
- Published files: `storage/app/published/{project_id}`
- Uploaded project assets: tracked through `project_files`
- Revisions: tracked through `project_revisions`

Project-scoped SQLite databases have been removed. Existing installs may still have legacy files under `storage/app/sqlite-databases/{user_id}`; clean them only through an explicit maintenance step after confirming they are no longer needed.

## Editor Flow

The code editor and file tree continue to call:

- `GET /builder/projects/{project}/files`
- `GET /builder/projects/{project}/file`
- `PUT /builder/projects/{project}/file`
- `PATCH /builder/projects/{project}/path`
- `POST /builder/projects/{project}/build`

For hosted manual projects without a builder, these routes use `App\Services\ProjectWorkspaceService`. For projects with an active builder, they proxy to the builder service so the optional assistant can edit the same code surface.

The workspace screen should expose these first-class views:

- Preview: hosted preview with desktop/tablet/mobile framing.
- Inspect: visual element selection and inline text/attribute edits.
- Structure: file/section-oriented project actions.
- Code: Monaco editor and file tree.
- Design: theme/color edits.
- History: revisions and restore.
- Settings: domain, publishing, storage, Firebase, SEO, and project settings.

There is no per-project database tab.

## Import And Runtime Rules

ZIP and file imports are validated before writing files:

- path traversal and absolute paths are rejected
- protected paths such as `.git`, `.env`, `.htaccess`, and `.user.ini` are rejected
- SQLite database files (`.sqlite`, `.sqlite3`, `.db`) are not accepted as project files
- imports do not overwrite existing files unless explicitly requested
- file count and uncompressed size limits are enforced

Static projects are served from the preview directory. Manual projects with `index.php` can be previewed through `/preview/{project}` and `/app/{project}`. PHP execution is limited to files inside the project workspace and uses a short process timeout.

Manual frontend projects can also host Vite-style apps. If the workspace contains `package.json`, `index.html`, and a frontend entry such as `src/main.tsx`, `src/main.ts`, `src/main.jsx`, or `src/main.js`, Webby treats it as a frontend project. **Sync Preview** runs the local Vite/React toolchain and writes the compiled static output to `storage/app/previews/{project_id}`.

Unsupported v1 runtime cases:

- persistent Node.js backends
- SSR servers
- long-running workers per project
- project-scoped SQLite or embedded database files
- binary files too large for browser editing
- ambiguous visual edits where the source value appears in multiple files

## Database Editor

The global database editor is an administrator-only tool at `/database`. It manages configured Laravel SQL connections, not per-project databases.

Capabilities:

- list configured SQL connections
- inspect tables and columns
- paginate rows
- create tables
- rename/drop non-protected tables
- add columns to non-protected tables
- create, update, and delete rows when the table has a single primary key

Protected system tables are marked in the UI. Schema changes are blocked for protected tables, and row changes require explicit confirmation.

## End-To-End Verification

1. Create a hosted site from pasted HTML.
2. Upload individual static/PHP files.
3. Upload a ZIP project.
4. Sync preview and verify `/preview/{project}` changes.
5. Edit a source file from the Code tab and confirm preview refresh.
6. Edit text or attributes from Inspect and confirm the source file changed.
7. Create a revision, restore it, and confirm preview/source rollback.
8. Publish to a subdomain and open the public URL.
9. Connect the optional AI assistant and ask for a code edit on an existing file.
10. Confirm there is no SQLite creation, association, or project database tab.
11. As admin, open `/database`, inspect a test table, edit a row, and confirm non-admin access is forbidden.
