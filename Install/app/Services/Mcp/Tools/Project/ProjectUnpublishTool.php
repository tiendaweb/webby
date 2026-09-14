<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Mcp\McpTool;

class ProjectUnpublishTool extends McpTool
{
    public function name(): string
    {
        return 'project_unpublish';
    }

    public function description(): string
    {
        return 'Unpublish this project (removes its subdomain).';
    }

    public function requiredAbility(): ?string
    {
        return 'publish:write';
    }

    public function inputSchema(): array
    {
        return ['type' => 'object', 'properties' => new \stdClass];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];
        $project->update(['subdomain' => null, 'published_at' => null]);

        return ['success' => true];
    }
}
