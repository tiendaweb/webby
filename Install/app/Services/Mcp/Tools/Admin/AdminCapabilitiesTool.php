<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Mcp\McpTool;
use App\Services\Mcp\McpToolRegistry;

/**
 * "Who am I and what am I allowed to do here?"
 *
 * Requires no ability on purpose: it is the first call a connector should
 * make, and its whole job is to let the assistant discover — rather than
 * guess — which of the other tools this particular token can actually use.
 * Without it, a token issued with a narrow ability set produces a string of
 * permission errors before the model works out what it is holding.
 */
class AdminCapabilitiesTool extends McpTool
{
    public function __construct(private readonly McpToolRegistry $registry) {}

    public function name(): string
    {
        return 'admin_capabilities';
    }

    public function description(): string
    {
        return 'Describe this connection: the platform it is attached to, the administrator it authenticates as, '
            .'the abilities the token carries, and which tools are therefore callable. Call this first.';
    }

    public function requiredAbility(): ?string
    {
        return null;
    }

    public function inputSchema(): array
    {
        return ['type' => 'object', 'properties' => new \stdClass];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $token = $context instanceof User ? $context->currentAccessToken() : null;
        $abilities = (array) ($token?->abilities ?? []);
        $wildcard = in_array('*', $abilities, true);

        $tools = array_map(function (McpTool $tool) use ($token, $wildcard) {
            $ability = $tool->requiredAbility();

            return [
                'name' => $tool->name(),
                'requires' => $ability,
                'allowed' => $ability === null || $wildcard || ($token !== null && $token->can($ability)),
            ];
        }, $this->registry->all('admin'));

        $allowed = array_values(array_filter($tools, fn (array $t) => $t['allowed']));

        return [
            'success' => true,
            'platform' => [
                'name' => SystemSetting::get('site_name', config('app.name')),
                'url' => config('app.url'),
                'base_domain' => SystemSetting::get('domain_base_domain', config('app.base_domain')),
                'subdomains_enabled' => (bool) SystemSetting::get('domain_enable_subdomains', false),
            ],
            'authenticated_as' => $context instanceof User
                ? ['id' => $context->id, 'name' => $context->name, 'email' => $context->email, 'role' => $context->role]
                : null,
            'token' => [
                'name' => $token?->name,
                'abilities' => $abilities,
                'expires_at' => $token?->expires_at?->toIso8601String(),
                'last_used_at' => $token?->last_used_at?->toIso8601String(),
            ],
            'tools' => $tools,
            'tools_total' => count($tools),
            'tools_allowed' => count($allowed),
            'how_to' => [
                'build_a_site' => 'admin_projects_create with a "files" map (no template needed), then publish=true or admin_projects_publish.',
                'upload_a_site' => 'admin_projects_import with zip_base64 or zip_url.',
                'edit_a_site' => 'admin_files_list / admin_files_read / admin_files_write against project_id (an id or a subdomain).',
                'work_with_data' => 'admin_db_connections_list, then admin_db_tables_list / admin_db_rows_list / admin_db_rows_write / admin_db_schema.',
                'onboard_a_customer' => 'admin_users_create, then admin_projects_create with that user_id.',
            ],
        ];
    }
}
