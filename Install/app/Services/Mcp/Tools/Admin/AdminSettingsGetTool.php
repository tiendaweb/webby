<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\SystemSetting;
use App\Services\Mcp\McpTool;

/**
 * Read platform configuration out of system_settings (base domain, brand
 * name, whether subdomain publishing is on, …) so a connector can answer
 * "where will this site live?" without the operator pasting it in.
 *
 * Values of keys that look like credentials are replaced with a masked
 * placeholder: the connector needs to know a provider key *exists*, never
 * what it is, and MCP arguments/results end up in a third party's
 * conversation history.
 */
class AdminSettingsGetTool extends McpTool
{
    /** Substrings that mark a setting as a credential rather than config. */
    private const SECRET_HINTS = ['secret', 'password', 'api_key', 'apikey', 'token', 'private_key', 'client_secret', 'webhook'];

    public function name(): string
    {
        return 'admin_settings_get';
    }

    public function description(): string
    {
        return 'Read platform settings from system_settings: one key, a whole group, or everything. '
            .'Credential-looking values are masked. Useful keys: domain_base_domain, domain_enable_subdomains, site_name.';
    }

    public function requiredAbility(): ?string
    {
        return 'settings:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'key' => ['type' => 'string', 'description' => 'Read a single setting.'],
                'group' => ['type' => 'string', 'description' => 'Read every setting of one group (e.g. "domain", "general").'],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $key = trim((string) ($arguments['key'] ?? ''));
        $group = trim((string) ($arguments['group'] ?? ''));

        $query = SystemSetting::query();

        if ($key !== '') {
            $query->where('key', $key);
        } elseif ($group !== '') {
            $query->where('group', $group);
        }

        $settings = $query->orderBy('group')->orderBy('key')->get()->map(fn (SystemSetting $s) => [
            'key' => $s->key,
            'group' => $s->group,
            'type' => $s->type,
            'value' => $this->isSecret($s->key) ? '••••••• (hidden)' : SystemSetting::get($s->key),
        ])->values();

        if ($key !== '' && $settings->isEmpty()) {
            return ['success' => false, 'message' => "No setting named \"{$key}\"."];
        }

        return [
            'success' => true,
            'settings' => $settings,
            'count' => $settings->count(),
            'base_domain' => SystemSetting::get('domain_base_domain', config('app.base_domain')),
            'subdomains_enabled' => (bool) SystemSetting::get('domain_enable_subdomains', false),
        ];
    }

    private function isSecret(string $key): bool
    {
        $lower = strtolower($key);

        foreach (self::SECRET_HINTS as $hint) {
            if (str_contains($lower, $hint)) {
                return true;
            }
        }

        return false;
    }
}
