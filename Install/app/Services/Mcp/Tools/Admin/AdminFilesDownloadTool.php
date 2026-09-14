<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\EditsWorkspaceFiles;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

/**
 * Fetch an image (or any allowed file) from a public URL straight into a
 * project's workspace, so the connector can use it in the site without a
 * human downloading and re-uploading it.
 *
 * Only public http(s) hosts, and the saved extension still has to be one
 * the workspace allows.
 */
class AdminFilesDownloadTool extends McpTool
{
    use SnapshotsWorkspace;
    use EditsWorkspaceFiles, ResolvesAdminTargets;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_files_download';
    }

    public function description(): string
    {
        return 'Download an image or file from a public URL into a project workspace so the site can use it. '
            .'Returns the path to reference from the HTML/CSS. Up to 25 MB; only file types the workspace allows.';
    }

    public function requiredAbility(): ?string
    {
        return 'files:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => ['project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.']] + $this->downloadSchema(),
            'required' => ['project_id', 'url'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $project = $this->resolveProject($arguments);

            $result = $this->workspace->downloadFile(
                $project,
                (string) ($arguments['url'] ?? ''),
                isset($arguments['path']) ? (string) $arguments['path'] : null,
                (bool) ($arguments['overwrite'] ?? false),
            );
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        // Punto de retorno antes de tocar los ficheros (con antirrebote:
        // ver SnapshotsWorkspace). Se devuelve como `revision_id` para que
        // quien llame sepa a dónde volver — o que esta vez no hay vuelta.
        $revisionId = $this->snapshotBeforeWrite($project, $context instanceof \App\Models\User ? $context : null, 'Antes de descargar un fichero', ['tool' => $this->name()]);

        return ['project_id' => $project->id, 'revision_id' => $revisionId] + $result;
    }
}
