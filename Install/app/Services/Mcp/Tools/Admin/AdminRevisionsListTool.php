<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\ProjectRevision;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectRevisionService;

class AdminRevisionsListTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(protected ProjectRevisionService $revisions) {}

    public function name(): string
    {
        return 'admin_revisions_list';
    }

    public function description(): string
    {
        return 'List the restore points of a project, newest first. Each one is a snapshot of the whole workspace: '
            .'use admin_revisions_restore with an id to put the site back the way it was.';
    }

    public function requiredAbility(): ?string
    {
        return 'projects:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.'],
                'limit' => ['type' => 'integer', 'default' => 25, 'maximum' => 100],
            ],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $this->resolveProject($arguments);
        $limit = min(max((int) ($arguments['limit'] ?? 25), 1), 100);

        $revisions = ProjectRevision::where('project_id', $project->id)
            ->with('user:id,name')
            ->latest()
            ->limit($limit)
            ->get();

        return [
            'success' => true,
            'project' => ['id' => $project->id, 'name' => $project->name],
            'revisions' => $revisions->map(fn (ProjectRevision $r) => $this->revisions->payload($r))->values()->all(),
        ];
    }
}
