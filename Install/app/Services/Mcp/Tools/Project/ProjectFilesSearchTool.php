<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Mcp\Concerns\EditsWorkspaceFiles;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

class ProjectFilesSearchTool extends McpTool
{
    use EditsWorkspaceFiles;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'project_files_search';
    }

    public function description(): string
    {
        return 'Search the text of every file in this site and return path + line number + the matching line. '
            .'Use it to locate what to change before calling project_files_edit, instead of reading whole files.';
    }

    public function requiredAbility(): ?string
    {
        return 'files:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => $this->searchSchema(),
            'required' => ['query'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $result = $this->workspace->searchFiles(
                $context['project'],
                (string) ($arguments['query'] ?? ''),
                isset($arguments['path_prefix']) ? (string) $arguments['path_prefix'] : null,
                (bool) ($arguments['regex'] ?? false),
                (bool) ($arguments['case_sensitive'] ?? false),
                (int) ($arguments['limit'] ?? 100),
            );
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return ['success' => true, 'match_count' => count($result['matches'])] + $result;
    }
}
