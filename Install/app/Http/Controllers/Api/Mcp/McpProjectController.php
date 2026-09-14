<?php

namespace App\Http\Controllers\Api\Mcp;

use App\Services\Mcp\McpAuthException;
use App\Services\Mcp\McpTool;
use Illuminate\Http\Request;

/**
 * POST /api/mcp/project/{project} — the client-side AI Connector MCP
 * server, strictly scoped to one project. VerifyConnectorToken has already
 * resolved and validated the project + token + active module activation
 * before this controller runs; resolveContext() re-checks activation status
 * defensively in case it lapsed mid-connection (MCP clients may hold a
 * connection open across multiple tool calls).
 */
class McpProjectController extends McpController
{
    protected function serverName(): string
    {
        return 'project';
    }

    protected function serverLabel(): string
    {
        return 'webby-mcp-project';
    }

    protected function instructions(): string
    {
        return implode("\n", [
            'This server is scoped to a single site on a '.config('app.name').' installation. Every tool acts on that one project — there is no way to reach another customer\'s site from here.',
            '',
            'You can list, search, read, edit, write, rename and delete the files of the site, download an image from a URL into it, create directories, read and change its settings and Firebase configuration, and publish or unpublish it.',
            '',
            'To change one detail, use project_files_search to find it and project_files_edit to change just that — project_file_write replaces a whole file and loses anything you did not reproduce. If a result carries "preview_warning", the file was saved but the site did not rebuild, so the published version is still the previous one.',
            '',
            'The site also has its own database (Firestore): project_firestore_collections_list to see what is in it, then project_firestore_documents_list / project_firestore_document_get / project_firestore_document_write. Deleting a document needs confirm=true.',
            '',
            'The owner can also leave you notes in the site chat — messages that were deliberately not sent to the AI builder. project_notes_list with status="pending" is your queue; project_notes_respond posts the answer, which the owner reads in the chat where the AI reply would normally be.',
            '',
            'Start with project_settings_get and project_files_list to see what the site currently is before changing anything.',
        ]);
    }

    protected function resolveContext(Request $request): mixed
    {
        $project = $request->attributes->get('project');
        $token = $request->attributes->get('connector_token');

        if (! $project || ! $token) {
            throw new McpAuthException('Connector token authentication required.');
        }

        $activation = $token->activation;

        if (! $activation || ! $activation->isActive()) {
            throw new McpAuthException('The AI Connector module is not active for this project.', -32001);
        }

        return ['project' => $project, 'token' => $token];
    }

    protected function authorizeTool(McpTool $tool, mixed $context): bool
    {
        $ability = $tool->requiredAbility();

        if ($ability === null) {
            return true;
        }

        return $context['token']->hasScope($ability);
    }

    protected function auditContext(mixed $context): array
    {
        return [
            'admin_user_id' => null,
            'project_id' => $context['project']?->id,
            'connector_token_id' => $context['token']?->id,
        ];
    }
}
