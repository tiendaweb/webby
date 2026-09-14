<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

class ProjectDirectoryCreateTool extends McpTool
{
    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'project_directory_create';
    }

    public function description(): string
    {
        return "Create a directory in this project's source workspace.";
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
                'path' => ['type' => 'string', 'description' => 'Relative directory path to create.'],
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
            $result = $this->workspace->createDirectory($project, $path);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return ['success' => true] + $result;
    }
}
