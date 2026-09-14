<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectStructureService;

class AdminStructureGetTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(protected ProjectStructureService $structure) {}

    public function name(): string
    {
        return 'admin_structure_get';
    }

    public function description(): string
    {
        return 'The pages and sections of a project as the builder sees them. Read this before editing a specific section: '
            .'it is what tells you which file and which block a change belongs in, instead of guessing from the raw HTML.';
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
            'structure' => $this->structure->structure($project),
        ];
    }
}
