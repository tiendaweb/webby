<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\User;
use App\Services\Mcp\McpTool;

/**
 * Read-only pilot tool: lists platform users (clients), mirroring
 * AdminUserController::index()'s query without the Inertia page wrapper.
 */
class AdminUsersListTool extends McpTool
{
    public function name(): string
    {
        return 'admin_users_list';
    }

    public function description(): string
    {
        return 'List Webby platform users (clients), optionally filtered by name/email search. Supports pagination.';
    }

    public function requiredAbility(): ?string
    {
        return 'users:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'search' => ['type' => 'string', 'description' => 'Filter by name or email substring.'],
                'per_page' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 20],
                'page' => ['type' => 'integer', 'minimum' => 1, 'default' => 1],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $perPage = min(max((int) ($arguments['per_page'] ?? 20), 1), 100);
        $page = max((int) ($arguments['page'] ?? 1), 1);
        $search = trim((string) ($arguments['search'] ?? ''));

        $query = User::query()->withCount('projects')->orderByDesc('created_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->paginate($perPage, ['*'], 'page', $page);

        return [
            'success' => true,
            'users' => $users->through(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status ?? 'active',
                'projects_count' => $user->projects_count,
                'plan_id' => $user->plan_id,
                'created_at' => $user->created_at?->toIso8601String(),
            ])->values()->all(),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ];
    }
}
