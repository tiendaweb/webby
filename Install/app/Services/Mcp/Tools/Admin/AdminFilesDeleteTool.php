<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

class AdminFilesDeleteTool extends McpTool
{
    use ResolvesAdminTargets;
    use SnapshotsWorkspace;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_files_delete';
    }

    public function description(): string
    {
        return 'Delete a file or a whole directory from any project workspace. Accepts "path" or a "paths" array.';
    }

    public function requiredAbility(): ?string
    {
        return 'files:delete';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string'],
                'path' => ['type' => 'string'],
                'paths' => ['type' => 'array', 'items' => ['type' => 'string']],
            ],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $project = $this->resolveProject($arguments);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        $paths = is_array($arguments['paths'] ?? null) ? $arguments['paths'] : [];

        if (($single = trim((string) ($arguments['path'] ?? ''))) !== '') {
            array_unshift($paths, $single);
        }

        if ($paths === []) {
            return ['success' => false, 'message' => 'Pass "path" or a non-empty "paths" array.'];
        }

        // Punto de retorno antes de tocar los ficheros (con antirrebote:
        // ver SnapshotsWorkspace). Se devuelve como `revision_id` para que
        // quien llame sepa a dónde volver — o que esta vez no hay vuelta.
        $revisionId = $this->snapshotBeforeWrite($project, $context instanceof \App\Models\User ? $context : null, 'Antes de borrar', ['tool' => $this->name()]);

        $deleted = [];
        $errors = [];

        foreach ($paths as $path) {
            try {
                $this->workspace->deletePath($project, (string) $path);
                $deleted[] = (string) $path;
            } catch (\Throwable $e) {
                $errors[(string) $path] = $e->getMessage();
            }
        }

        return [
            'success' => $deleted !== [],
            'message' => $deleted === [] ? 'Nothing was deleted.' : null,
            'project_id' => $project->id,
            'revision_id' => $revisionId,
            'deleted' => $deleted,
            'errors' => $errors ?: null,
        ];
    }
}
