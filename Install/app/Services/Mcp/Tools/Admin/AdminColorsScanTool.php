<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectColorScanService;

class AdminColorsScanTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(protected ProjectColorScanService $colors) {}

    public function name(): string
    {
        return 'admin_colors_scan';
    }

    public function description(): string
    {
        return 'Every colour a project uses, with the file and token where each one lives. '
            .'Pair it with admin_colors_replace to change a brand colour across a whole site without rewriting files by hand.';
    }

    public function requiredAbility(): ?string
    {
        return 'projects:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => ['project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.']],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $this->resolveProject($arguments);

        return [
            'success' => true,
            'project_id' => $project->id,
            'colors' => $this->colors->scan($project),
        ];
    }
}
