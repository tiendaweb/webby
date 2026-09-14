<?php

namespace App\Services\Mcp\Tools\Project;

use App\Models\ProjectRevision;
use App\Services\Mcp\McpTool;
use App\Services\ProjectRevisionService;

class ProjectRevisionsListTool extends McpTool
{
    public function __construct(protected ProjectRevisionService $revisions) {}

    public function name(): string
    {
        return 'project_revisions_list';
    }

    public function description(): string
    {
        return 'List this site\'s restore points, newest first. Each one is a snapshot of the whole site: '
            .'use project_revisions_restore with an id to put it back the way it was.';
    }

    public function requiredAbility(): ?string
    {
        return 'files:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => ['limit' => ['type' => 'integer', 'default' => 25, 'maximum' => 100]],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];
        $limit = min(max((int) ($arguments['limit'] ?? 25), 1), 100);

        $revisions = ProjectRevision::where('project_id', $project->id)
            ->with('user:id,name')
            ->latest()
            ->limit($limit)
            ->get();

        return [
            'success' => true,
            'revisions' => $revisions->map(fn (ProjectRevision $r) => $this->revisions->payload($r))->values()->all(),
        ];
    }
}
