<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\User;
use App\Services\Mcp\McpTool;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

/**
 * Mirrors AdminUserController::update() / UpdateUserRequest's field set
 * exactly (name/email/password/role/status), including the guard against
 * an admin demoting their own role via this tool.
 */
class AdminUsersUpdateTool extends McpTool
{
    public function name(): string
    {
        return 'admin_users_update';
    }

    public function description(): string
    {
        return 'Update a platform user: name, email, password, role (admin|user), or status (active|inactive).';
    }

    public function requiredAbility(): ?string
    {
        return 'users:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'user_id' => ['type' => 'integer'],
                'name' => ['type' => 'string'],
                'email' => ['type' => 'string'],
                'password' => ['type' => 'string'],
                'role' => ['type' => 'string', 'enum' => ['admin', 'user']],
                'status' => ['type' => 'string', 'enum' => ['active', 'inactive']],
            ],
            'required' => ['user_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $user = User::find((int) ($arguments['user_id'] ?? 0));

        if (! $user) {
            return ['success' => false, 'message' => 'User not found.'];
        }

        $fields = array_intersect_key($arguments, array_flip(['name', 'email', 'password', 'role', 'status']));

        $validator = Validator::make($fields, [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'password' => ['sometimes', 'nullable', 'string', 'min:8'],
            'role' => ['sometimes', 'in:admin,user'],
            'status' => ['sometimes', 'in:active,inactive'],
        ]);

        if ($validator->fails()) {
            return ['success' => false, 'message' => $validator->errors()->first()];
        }

        $validated = $validator->validated();

        /** @var User $admin */
        $admin = $context;
        if ($user->id === $admin->id && isset($validated['role']) && $validated['role'] !== 'admin') {
            return ['success' => false, 'message' => 'Cannot change your own admin role.'];
        }

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return ['success' => true, 'user' => $user->fresh()->only(['id', 'name', 'email', 'role', 'status'])];
    }
}
