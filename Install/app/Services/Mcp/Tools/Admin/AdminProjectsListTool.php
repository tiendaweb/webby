<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Project;
use App\Services\Mcp\McpTool;

class AdminProjectsListTool extends McpTool
{
    public function name(): string
    {
        return 'admin_projects_list';
    }

    public function description(): string
    {
        return "List client projects/sites across the whole platform, optionally filtered by owner or name search.";
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
                'user_id' => ['type' => 'integer', 'description' => 'Filter to one client\'s projects.'],
                'search' => ['type' => 'string'],
                'per_page' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 20],
                'page' => ['type' => 'integer', 'minimum' => 1, 'default' => 1],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $perPage = min(max((int) ($arguments['per_page'] ?? 20), 1), 100);
        $page = max((int) ($arguments['page'] ?? 1), 1);

        $query = Project::query()->with('user:id,name,email')->orderByDesc('updated_at');

        if (! empty($arguments['user_id'])) {
            $query->where('user_id', (int) $arguments['user_id']);
        }

        if (! empty($arguments['search'])) {
            $query->where('name', 'like', '%'.$arguments['search'].'%');
        }

        $projects = $query->paginate($perPage, ['*'], 'page', $page);

        return [
            'success' => true,
            'projects' => $projects->through(fn (Project $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'type' => $p->type,
                'owner' => $p->user ? ['id' => $p->user->id, 'name' => $p->user->name, 'email' => $p->user->email] : null,
                'build_status' => $p->build_status,
                'subdomain' => $p->subdomain,
                'custom_domain' => $p->custom_domain,
                'is_public' => $p->is_public,
                'created_at' => $p->created_at?->toIso8601String(),
                'updated_at' => $p->updated_at?->toIso8601String(),
            ])->values()->all(),
            'pagination' => [
                'current_page' => $projects->currentPage(),
                'last_page' => $projects->lastPage(),
                'per_page' => $projects->perPage(),
                'total' => $projects->total(),
            ],
        ];
    }
}
