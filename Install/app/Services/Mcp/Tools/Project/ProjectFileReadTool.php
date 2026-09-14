<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

/**
 * Read-only pilot tool: returns the content of a single file from the
 * connected project's source workspace.
 */
class ProjectFileReadTool extends McpTool
{
    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'project_file_read';
    }

    public function description(): string
    {
        return "Read the contents of a single file from this project's source workspace.";
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
                'path' => ['type' => 'string', 'description' => 'Relative file path within the project workspace.'],
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

        try {
            $result = $this->workspace->readFile($project, $path);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return ['success' => true] + $result;
    }
}
