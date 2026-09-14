<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

/**
 * File-manager parity for the admin connector: the same workspace tree the
 * /file-manager UI shows, for any project on the platform.
 */
class AdminFilesListTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_files_list';
    }

    public function description(): string
    {
        return 'List every file and directory in any project workspace, with sizes and the detected runtime. Optionally filter to a path prefix.';
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
                'project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.'],
                'prefix' => ['type' => 'string', 'description' => 'Only return entries whose path starts with this prefix, e.g. "assets/".'],
            ],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $project = $this->resolveProject($arguments);
            $result = $this->workspace->listFiles($project);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        $prefix = trim((string) ($arguments['prefix'] ?? ''), '/');

        if ($prefix !== '') {
            $result['files'] = array_values(array_filter(
                $result['files'],
                fn (array $entry) => str_starts_with((string) $entry['path'], $prefix)
            ));
        }

        return [
            'success' => true,
            'project_id' => $project->id,
            'runtime' => $result['runtime'] ?? null,
            'count' => count($result['files']),
            'files' => $result['files'],
        ];
    }
}
