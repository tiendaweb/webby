<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Project;
use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

class AdminProjectsUpdateFileTool extends McpTool
{
    use SnapshotsWorkspace;
    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_projects_update_file';
    }

    public function description(): string
    {
        return "Write/overwrite a file in any client project's source workspace, by project id. High-impact — edits a client's live app on their behalf.";
    }

    public function requiredAbility(): ?string
    {
        return 'projects:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string'],
                'path' => ['type' => 'string'],
                'content' => ['type' => 'string'],
            ],
            'required' => ['project_id', 'path', 'content'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = Project::find((string) ($arguments['project_id'] ?? ''));

        if (! $project) {
            return ['success' => false, 'message' => 'Project not found.'];
        }

        $path = (string) ($arguments['path'] ?? '');
        if ($path === '') {
            return ['success' => false, 'message' => '"path" is required.'];
        }

        // Punto de retorno antes de tocar los ficheros (con antirrebote:
        // ver SnapshotsWorkspace). Se devuelve como `revision_id` para que
        // quien llame sepa a dónde volver — o que esta vez no hay vuelta.
        $revisionId = $this->snapshotBeforeWrite($project, $context instanceof \App\Models\User ? $context : null, 'Antes de actualizar un fichero', ['tool' => $this->name()]);

        try {
            $result = $this->workspace->writeFile($project, $path, (string) ($arguments['content'] ?? ''));
        } catch (\Throwable $e) {
            return ['success' => false, 'revision_id' => $revisionId, 'message' => $e->getMessage()];
        }

        return ['success' => true, 'revision_id' => $revisionId, 'revision_id' => $revisionId] + $result;
    }
}
