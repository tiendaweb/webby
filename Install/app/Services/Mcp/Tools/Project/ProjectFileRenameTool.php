<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

class ProjectFileRenameTool extends McpTool
{
    use SnapshotsWorkspace;
    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'project_file_rename';
    }

    public function description(): string
    {
        return "Rename or move a file/directory within this project's source workspace.";
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
                'from' => ['type' => 'string', 'description' => 'Current relative path.'],
                'to' => ['type' => 'string', 'description' => 'New relative path.'],
            ],
            'required' => ['from', 'to'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];
        $from = (string) ($arguments['from'] ?? '');
        $to = (string) ($arguments['to'] ?? '');

        if ($from === '' || $to === '') {
            return ['success' => false, 'message' => '"from" and "to" are both required.'];
        }

        // Punto de retorno antes de tocar los ficheros (con antirrebote:
        // ver SnapshotsWorkspace). Se devuelve como `revision_id` para que
        // quien llame sepa a dónde volver — o que esta vez no hay vuelta.
        $revisionId = $this->snapshotBeforeWrite($project, $project->user, 'Antes de renombrar', ['tool' => $this->name()]);

        try {
            $result = $this->workspace->renamePath($project, $from, $to);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return ['success' => true, 'revision_id' => $revisionId] + $result;
    }
}
