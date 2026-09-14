<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

/**
 * Read-only pilot tool: lists every file/directory in the connected
 * project's source workspace, via the same service the dashboard's file
 * manager and BuilderProxyController use for 'blank' projects.
 */
class ProjectFilesListTool extends McpTool
{
    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'project_files_list';
    }

    public function description(): string
    {
        return "List all files and directories in this project's source workspace.";
    }

    public function requiredAbility(): ?string
    {
        return 'files:read';
    }

    public function inputSchema(): array
    {
        return ['type' => 'object', 'properties' => new \stdClass];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];

        $result = $this->workspace->listFiles($project);

        return ['success' => true] + $result;
    }
}
