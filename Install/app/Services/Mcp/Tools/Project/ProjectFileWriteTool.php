<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

class ProjectFileWriteTool extends McpTool
{
    use SnapshotsWorkspace;
    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'project_file_write';
    }

    public function description(): string
    {
        return "Create or overwrite a file in this project's source workspace. Rejects disallowed file extensions and path traversal.";
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
                'path' => ['type' => 'string', 'description' => 'Relative file path within the project workspace.'],
                'content' => ['type' => 'string', 'description' => 'Full file content to write.'],
            ],
            'required' => ['path', 'content'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];
        $path = (string) ($arguments['path'] ?? '');
        $content = (string) ($arguments['content'] ?? '');

        if ($path === '') {
            return ['success' => false, 'message' => '"path" is required.'];
        }

        // Punto de retorno antes de tocar los ficheros (con antirrebote:
        // ver SnapshotsWorkspace). Se devuelve como `revision_id` para que
        // quien llame sepa a dónde volver — o que esta vez no hay vuelta.
        $revisionId = $this->snapshotBeforeWrite($project, $project->user, 'Antes de escribir un fichero', ['tool' => $this->name()]);

        try {
            $result = $this->workspace->writeFile($project, $path, $content);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return ['success' => true, 'revision_id' => $revisionId] + $result;
    }
}
