<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\EditsWorkspaceFiles;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

/**
 * Find which file (and line) holds the thing you are about to change —
 * the read half of editing one detail without reading whole files.
 */
class AdminFilesSearchTool extends McpTool
{
    use EditsWorkspaceFiles, ResolvesAdminTargets;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_files_search';
    }

    public function description(): string
    {
        return 'Search the text of every file in a project and return path + line number + the matching line. '
            .'Use it to locate what to change before calling admin_files_edit, instead of reading whole files.';
    }

    public function requiredAbility(): ?string
    {
        return 'files:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => ['project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.']] + $this->searchSchema(),
            'required' => ['project_id', 'query'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $project = $this->resolveProject($arguments);

            $result = $this->workspace->searchFiles(
                $project,
                (string) ($arguments['query'] ?? ''),
                isset($arguments['path_prefix']) ? (string) $arguments['path_prefix'] : null,
                (bool) ($arguments['regex'] ?? false),
                (bool) ($arguments['case_sensitive'] ?? false),
                (int) ($arguments['limit'] ?? 100),
            );
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return ['success' => true, 'project_id' => $project->id, 'match_count' => count($result['matches'])] + $result;
    }
}
