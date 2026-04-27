<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class SystemSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'type',
        'group',
    ];

    protected const CACHE_TTL = 3600; // 1 hour

    /**
     * Get a setting value by key with optional default.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        try {
            $cacheKey = "setting.{$key}";

            return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($key, $default) {
                $setting = self::where('key', $key)->first();

                if (! $setting) {
                    return $default;
                }

                return self::castValue($setting->value, $setting->type);
            });
        } catch (\Exception $e) {
            // Database not available (fresh install)
            return $default;
        }
    }

    /**
     * Set a setting value.
     */
    public static function set(string $key, mixed $value, string $type = 'string', ?string $group = null): self
    {
        $storableValue = match ($type) {
            'boolean' => $value ? '1' : '0',
            'integer' => (string) $value,
            'json' => is_string($value) ? $value : json_encode($value),
            'encrypted_json' => encrypt(is_string($value) ? $value : json_encode($value)),
            default => (string) $value,
        };

        $setting = self::updateOrCreate(
            ['key' => $key],
            [
                'value' => $storableValue,
                'type' => $type,
                'group' => $group ?? self::where('key', $key)->value('group') ?? 'general',
            ]
        );

        // Clear cache
        Cache::forget("setting.{$key}");
        Cache::forget("settings.group.{$setting->group}");

        return $setting;
    }

    /**
     * Set multiple settings at once.
     */
    public static function setMany(array $settings, string $group): void
    {
        foreach ($settings as $key => $value) {
            $type = self::detectType($value);
            self::set($key, $value, $type, $group);
        }
    }

    /**
     * Get all settings in a group.
     */
    public static function getGroup(string $group): array
    {
        try {
            $cacheKey = "settings.group.{$group}";

            return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($group) {
                return self::where('group', $group)
                    ->get()
                    ->mapWithKeys(fn ($setting) => [$setting->key => self::castValue($setting->value, $setting->type)])
                    ->toArray();
            });
        } catch (\Exception $e) {
            // Database not available (fresh install)
            return [];
        }
    }

    /**
     * Cast value based on type.
     */
    protected static function castValue(mixed $value, string $type): mixed
    {
        if ($value === null) {
            return null;
        }

        return match ($type) {
            'integer' => (int) $value,
            'boolean' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'json' => json_decode($value, true),
            'encrypted_json' => json_decode(decrypt($value), true),
            default => $value,
        };
    }

    /**
     * Detect type from value.
     */
    protected static function detectType(mixed $value): string
    {
        if (is_bool($value)) {
            return 'boolean';
        }
        if (is_int($value)) {
            return 'integer';
        }
        if (is_array($value)) {
            return 'json';
        }

        return 'string';
    }

    /**
     * Clear all settings cache.
     */
    public static function clearCache(): void
    {
        $groups = self::distinct()->pluck('group');
        $keys = self::pluck('key');

        foreach ($keys as $key) {
            Cache::forget("setting.{$key}");
        }

        foreach ($groups as $group) {
            Cache::forget("settings.group.{$group}");
        }
    }

    /**
     * Check if email/SMTP is properly configured.
     */
    public static function isEmailConfigured(): bool
    {
        // Clear individual key cache to get fresh value
        $mailer = self::get('mail_mailer', 'sendmail');

        if ($mailer === 'smtp') {
            $host = self::get('smtp_host');
            $username = self::get('smtp_username');

            return ! empty($host) && ! empty($username);
        }

        return ! empty(self::get('mail_from_address'));
    }

    /**
     * Scope query to a specific group.
     */
    public function scopeGroup($query, string $group)
    {
        return $query->where('group', $group);
    }
}
