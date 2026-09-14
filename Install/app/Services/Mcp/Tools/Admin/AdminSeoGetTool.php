<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectSeoService;

class AdminSeoGetTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(protected ProjectSeoService $seo) {}

    public function name(): string
    {
        return 'admin_seo_get';
    }

    public function description(): string
    {
        return 'Read the SEO settings of every page of a project: title, description, slug, canonical, social image, favicon and whether it is indexable.';
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

        return ['success' => true, 'project_id' => $project->id] + $this->seo->index($project);
    }
}
