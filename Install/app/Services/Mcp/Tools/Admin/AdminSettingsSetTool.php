<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\SystemSetting;
use App\Services\Mcp\McpTool;

/**
 * Write one platform setting. Deliberately one key per call rather than a
 * bulk map: these are installation-wide switches (the base domain every
 * published site resolves under, whether registration is open) where a
 * model batching six changes it half-understood is the failure mode worth
 * designing against.
 *
 * A short deny-list keeps the connector out of the two keys that could lock
 * the operator out of their own install.
 */
class AdminSettingsSetTool extends McpTool
{
    /** Keys that must be changed from the admin UI, never from a connector. */
    private const LOCKED_KEYS = ['installed', 'installation_completed', 'license_key', 'app_key'];

    public function name(): string
    {
        return 'admin_settings_set';
    }

    public function description(): string
    {
        return 'Set a single platform setting in system_settings. Pass type to control storage '
            .'(string, boolean, integer, json). Installation/licence keys are refused.';
    }

    public function requiredAbility(): ?string
    {
        return 'settings:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'key' => ['type' => 'string'],
                'value' => ['description' => 'New value. Booleans/integers are coerced according to "type".'],
                'type' => ['type' => 'string', 'enum' => ['string', 'boolean', 'integer', 'json'], 'default' => 'string'],
                'group' => ['type' => 'string', 'description' => 'Only used when the setting does not exist yet.'],
            ],
            'required' => ['key', 'value'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $key = trim((string) ($arguments['key'] ?? ''));

        if ($key === '') {
            return ['success' => false, 'message' => '"key" is required.'];
        }

        if (in_array(strtolower($key), self::LOCKED_KEYS, true)) {
            return ['success' => false, 'message' => "\"{$key}\" can only be changed from the admin panel."];
        }

        $type = (string) ($arguments['type'] ?? 'string');

        if (! in_array($type, ['string', 'boolean', 'integer', 'json'], true)) {
            $type = 'string';
        }

        $existing = SystemSetting::where('key', $key)->first();
        $previous = $existing ? SystemSetting::get($key) : null;

        SystemSetting::set(
            $key,
            $arguments['value'],
            $existing?->type ?: $type,
            $existing?->group ?: (string) ($arguments['group'] ?? 'general'),
        );

        return [
            'success' => true,
            'key' => $key,
            'previous_value' => $previous,
            'value' => SystemSetting::get($key),
            'created' => $existing === null,
        ];
    }
}
