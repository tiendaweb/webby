<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

class AdminFilesReadTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_files_read';
    }

    public function description(): string
    {
        return 'Read the contents of one file from any project workspace. Pass several paths in "paths" to read them in a single call.';
    }

    public function requiredAbility(): ?string
    {
        return 'files:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string'],
                'path' => ['type' => 'string'],
                'paths' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Read multiple files at once.'],
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

        $files = [];
        $errors = [];

        foreach ($paths as $path) {
            try {
                $files[] = $this->workspace->readFile($project, (string) $path);
            } catch (\Throwable $e) {
                $errors[(string) $path] = $e->getMessage();
            }
        }

        return [
            'success' => $files !== [],
            'message' => $files === [] ? 'No file could be read.' : null,
            'project_id' => $project->id,
            'files' => $files,
            'errors' => $errors ?: null,
        ];
    }
}
