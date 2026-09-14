<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

class AdminFilesRenameTool extends McpTool
{
    use ResolvesAdminTargets;
    use SnapshotsWorkspace;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_files_rename';
    }

    public function description(): string
    {
        return 'Rename or move a file or directory inside any project workspace.';
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
                'project_id' => ['type' => 'string'],
                'from' => ['type' => 'string'],
                'to' => ['type' => 'string'],
            ],
            'required' => ['project_id', 'from', 'to'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $project = $this->resolveProject($arguments);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        // Punto de retorno antes de tocar los ficheros (con antirrebote:
        // ver SnapshotsWorkspace). Se devuelve como `revision_id` para que
        // quien llame sepa a dónde volver — o que esta vez no hay vuelta.
        $revisionId = $this->snapshotBeforeWrite($project, $context instanceof \App\Models\User ? $context : null, 'Antes de renombrar', ['tool' => $this->name()]);

        try {
            $result = $this->workspace->renamePath($project, (string) $arguments['from'], (string) $arguments['to']);
        } catch (\Throwable $e) {
            return ['success' => false, 'revision_id' => $revisionId, 'message' => $e->getMessage()];
        }

        return ['success' => true, 'revision_id' => $revisionId, 'project_id' => $project->id] + $result;
    }
}
