<?php

namespace App\Http\Controllers\Api\Mcp;

use App\Services\Mcp\McpAuthException;
use App\Services\Mcp\McpTool;
use Illuminate\Http\Request;

/**
 * POST /api/mcp/admin — platform-management MCP server for the admin
 * connector (Claude/ChatGPT/Grok). Authenticated with a Sanctum personal
 * access token belonging to a role=admin User; every write-risk tool
 * additionally requires an explicit ability on that token (see
 * McpTool::requiredAbility).
 *
 * A token issued here carries the same authority as an admin dashboard
 * session — it must only ever be granted the abilities the caller actually
 * needs, and must never be exposed to a client-facing surface.
 */
class McpAdminController extends McpController
{
    protected function serverName(): string
    {
        return 'admin';
    }

    protected function serverLabel(): string
    {
        return 'webby-mcp-admin';
    }

    /**
     * Sent back on initialize; Claude, ChatGPT and Grok all surface this to
     * the model as standing context for the server.
     */
    protected function instructions(): string
    {
        return implode("\n", [
            'This server administers a '.config('app.name').' website-builder platform: customer accounts, their projects/sites, the files of each site, the platform database and its settings.',
            '',
            'Call admin_capabilities first — it reports which tools this token may actually use.',
            '',
            'Common jobs:',
            '- Build a site from a prompt, no template: admin_projects_create with a "files" map (path => content), optionally publish=true plus a subdomain.',
            '- Upload an existing site: admin_projects_import with zip_base64 or zip_url.',
            '- Change one detail of a live site: admin_files_search to find it, then admin_files_edit to change just that (find/replace, all-or-nothing). Only use admin_files_write when you are replacing a whole file. "project_id" accepts either the project id or its subdomain.',
            '- Add an image: admin_files_download pulls it from a public URL into the workspace and gives you the path to reference.',
            '- After editing a frontend (Vite/React) project, check admin_projects_preview_build: a build that fails leaves the previous version live, and the write tools report that as "preview_warning" rather than failing.',
            '- Publish or unpublish: admin_projects_publish.',
            '- A customer site\'s own database (Firebase/Firestore): admin_firebase_credentials_get to see what it is wired to, then admin_firestore_collections_list / admin_firestore_documents_list / admin_firestore_document_get / admin_firestore_document_write. admin_firebase_credentials_set attaches a customer\'s own Firebase project.',
            '- The platform\'s own SQL database: admin_db_connections_list, then admin_db_tables_list / admin_db_rows_list / admin_db_rows_write / admin_db_schema.',
            '- New customer: admin_users_create, then create their project with that user_id.',
            '- Work the owner left for you: admin_notes_list with status="pending" returns notes written in a project chat that were deliberately NOT sent to the AI builder. Do the work, then admin_notes_respond — your reply is what the owner reads in the chat where the AI answer would normally be, so describe what you actually changed.',
            '',
            'Destructive calls (drop_table, drop_column, force-deleting a project, writing to a protected system table) require an explicit confirm/allow flag and, for system tables, the database:protected ability. Every call is recorded in the platform audit log.',
        ]);
    }

    protected function resolveContext(Request $request): mixed
    {
        $user = $request->user();

        if (! $user || ! $user->isAdmin()) {
            throw new McpAuthException('Admin authentication required.');
        }

        return $user;
    }

    protected function authorizeTool(McpTool $tool, mixed $context): bool
    {
        $ability = $tool->requiredAbility();

        if ($ability === null) {
            return true;
        }

        $token = $context->currentAccessToken();

        return $token !== null && $token->can($ability);
    }

    protected function auditContext(mixed $context): array
    {
        return ['admin_user_id' => $context?->id, 'project_id' => null, 'connector_token_id' => null];
    }
}
