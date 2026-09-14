<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Plan;
use App\Models\User;
use App\Services\Mcp\McpTool;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Facades\Validator;

/**
 * Create a client account, so "set up a new customer and build their site"
 * is one conversation instead of a trip to the admin panel first.
 *
 * The generated password is returned exactly once, in the tool result — the
 * caller is expected to hand it to the customer and have them change it.
 * The account is created already email-verified because an admin creating
 * it by hand is the verification.
 */
class AdminUsersCreateTool extends McpTool
{
    public function name(): string
    {
        return 'admin_users_create';
    }

    public function description(): string
    {
        return 'Create a customer account. Returns the generated password once if none was supplied. '
            .'Use the returned user_id as the owner of admin_projects_create.';
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
                'name' => ['type' => 'string', 'maxLength' => 255],
                'email' => ['type' => 'string', 'format' => 'email'],
                'password' => ['type' => 'string', 'description' => 'Omit to have one generated and returned once.'],
                'role' => ['type' => 'string', 'enum' => ['user', 'admin'], 'default' => 'user'],
                'plan_id' => ['type' => 'integer', 'description' => 'Plan to assign. Defaults to the platform default plan.'],
                'locale' => ['type' => 'string', 'description' => 'e.g. "es_AR", "en".'],
                'build_credits' => ['type' => 'integer'],
            ],
            'required' => ['name', 'email'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $validator = Validator::make($arguments, [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => ['nullable', 'string', Password::min(8)],
            'role' => 'nullable|in:user,admin',
            'plan_id' => 'nullable|integer|exists:plans,id',
            'locale' => 'nullable|string|max:12',
            'build_credits' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return ['success' => false, 'message' => $validator->errors()->first(), 'errors' => $validator->errors()->toArray()];
        }

        $generated = null;
        $password = $arguments['password'] ?? null;

        if (! is_string($password) || $password === '') {
            $generated = Str::password(16);
            $password = $generated;
        }

        $planId = $arguments['plan_id'] ?? Plan::where('is_default', true)->value('id') ?? Plan::orderBy('id')->value('id');

        $user = User::create([
            'name' => (string) $arguments['name'],
            'email' => (string) $arguments['email'],
            'password' => $password,
            'role' => $arguments['role'] ?? 'user',
            'status' => 'active',
            'plan_id' => $planId,
            'locale' => $arguments['locale'] ?? null,
            'build_credits' => $arguments['build_credits'] ?? 0,
        ]);

        // An admin creating the account by hand is the verification step.
        $user->forceFill(['email_verified_at' => now()])->save();

        return [
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'plan_id' => $user->plan_id,
            ],
            'generated_password' => $generated,
            'message' => $generated
                ? 'Account created. Give the customer this password now — it is not stored in readable form and will not be shown again.'
                : 'Account created.',
        ];
    }
}
