<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Project;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

/**
 * Admin-bypass version of project_files_list — no ownership/ProjectPolicy
 * check, any project on the platform, by design (this is the admin server).
 */
class AdminProjectsGetFilesTool extends McpTool
{
    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_projects_get_files';
    }

    public function description(): string
    {
        return "List all files/directories in any client project's source workspace, by project id.";
    }

    public function requiredAbility(): ?string
    {
        return 'projects:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => ['project_id' => ['type' => 'string']],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = Project::find((string) ($arguments['project_id'] ?? ''));

        if (! $project) {
            return ['success' => false, 'message' => 'Project not found.'];
        }

        return ['success' => true] + $this->workspace->listFiles($project);
    }
}
