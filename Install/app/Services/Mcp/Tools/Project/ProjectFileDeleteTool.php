<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

class ProjectFileDeleteTool extends McpTool
{
    use SnapshotsWorkspace;
    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'project_file_delete';
    }

    public function description(): string
    {
        return "Delete a file or directory (recursively) from this project's source workspace.";
    }

    public function requiredAbility(): ?string
    {
        return 'files:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'path' => ['type' => 'string', 'description' => 'Relative file or directory path within the project workspace.'],
            ],
            'required' => ['path'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];
        $path = (string) ($arguments['path'] ?? '');

        if ($path === '') {
            return ['success' => false, 'message' => '"path" is required.'];
        }

        // Punto de retorno antes de tocar los ficheros (con antirrebote:
        // ver SnapshotsWorkspace). Se devuelve como `revision_id` para que
        // quien llame sepa a dónde volver — o que esta vez no hay vuelta.
        $revisionId = $this->snapshotBeforeWrite($project, $project->user, 'Antes de borrar', ['tool' => $this->name()]);

        try {
            $result = $this->workspace->deletePath($project, $path);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return ['success' => true, 'revision_id' => $revisionId] + $result;
    }
}
