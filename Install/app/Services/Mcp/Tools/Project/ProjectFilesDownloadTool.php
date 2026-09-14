<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Mcp\Concerns\EditsWorkspaceFiles;
use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

class ProjectFilesDownloadTool extends McpTool
{
    use EditsWorkspaceFiles;
    use SnapshotsWorkspace;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'project_files_download';
    }

    public function description(): string
    {
        return 'Download an image or file from a public URL into this site so it can use it. '
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
            'properties' => $this->downloadSchema(),
            'required' => ['url'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];

        // Punto de retorno antes de tocar los ficheros (con antirrebote:
        // ver SnapshotsWorkspace). Se devuelve como `revision_id` para que
        // quien llame sepa a dónde volver — o que esta vez no hay vuelta.
        $revisionId = $this->snapshotBeforeWrite($project, $project->user, 'Antes de descargar un fichero', ['tool' => $this->name()]);

        try {
            return ['revision_id' => $revisionId] + $this->workspace->downloadFile(
                $project,
                (string) ($arguments['url'] ?? ''),
                isset($arguments['path']) ? (string) $arguments['path'] : null,
                (bool) ($arguments['overwrite'] ?? false),
            );
        } catch (\Throwable $e) {
            return ['success' => false, 'revision_id' => $revisionId, 'message' => $e->getMessage()];
        }
    }
}
