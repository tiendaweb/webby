# Repository Guidelines

## Project Structure & Module Organization

The main Webby application lives in `Install/`. Laravel backend code is in `Install/app/`, with controllers in `Http/Controllers`, business logic in `Services`, models in `Models`, Artisan commands in `Console/Commands`, and payment plugins in `app/Plugins/PaymentGateways`. Routes are in `Install/routes/`, config in `Install/config/`, migrations and seeders in `Install/database/`, and localization JSON in `Install/lang/<locale>/`.

Frontend source is in `Install/resources/js/`: Inertia pages in `Pages`, reusable UI in `components`, hooks in `hooks`, shared types in `types`, and colocated `*.test.ts(x)` tests. CSS is in `Install/resources/css/`; Blade shells are in `Install/resources/views/`. Root Docker files support containers; `Documentation/` contains docs assets.

## Build, Test, and Development Commands

Run application commands from `Install/` unless noted.

- `composer install` / `npm install`: install PHP and frontend dependencies.
- `composer dev`: starts Laravel, queue listener, logs, and Vite.
- `npm run dev`: starts only the Vite dev server.
- `npm run build`: type-checks with `tsc` and builds production assets.
- `composer test` or `php artisan test`: runs PHPUnit using `phpunit.xml`.
- `npm run test:run`: runs Vitest once; `npm test` watches.
- `npm run lint` / `npm run lint:strict`: lint `resources/js`; strict fails on warnings.
- From repo root, `docker compose up -d` starts the container stack.

## Coding Style & Naming Conventions

Follow `Install/.editorconfig`: UTF-8, LF endings, spaces, 4-space indentation, final newline, and 2-space YAML indentation. PHP follows Laravel conventions: PSR-4 namespaces, StudlyCase classes, singular Eloquent models, and descriptive service names such as `ProjectWorkspaceService`. React components use PascalCase filenames; hooks use `useX.ts`; shared types live in `resources/js/types`. ESLint allows warnings but enforces React hook rule errors.

## Testing Guidelines

PHPUnit is configured for Unit, Feature, Install, and Upgrade suites with SQLite in-memory defaults. Add backend tests under the matching `Install/tests/...` suite. Frontend tests use Vitest, Testing Library, and jsdom; place tests near source as `ComponentName.test.tsx` or `module.test.ts`. Run both PHP and frontend tests for Laravel/Inertia changes.

## Commit & Pull Request Guidelines

Recent history uses short Conventional Commit-style subjects such as `feat: ...` and `docs: ...`; keep that pattern. PRs should describe the user-facing change, list verification commands, link related issues, and include screenshots for UI changes. Note migrations, environment variables, queue/reverb behavior, and localization changes explicitly.

## Security & Configuration Tips

Do not commit `.env`, secrets, generated storage, `vendor/`, or `node_modules/`. Keep examples in `.env.example`, validate uploaded project files, and review payment, domain, AI-provider, and Firebase changes for credential handling.
