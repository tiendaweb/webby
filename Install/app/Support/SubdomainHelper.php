<?php

namespace App\Support;

use App\Models\Project;
use App\Models\SystemSetting;
use Illuminate\Support\Str;

class SubdomainHelper
{
    public const RESERVED_SUBDOMAINS = [
        'www', 'api', 'app', 'admin', 'dashboard', 'mail', 'smtp', 'ftp',
        'blog', 'shop', 'store', 'help', 'support', 'docs',
        'status', 'cdn', 'assets', 'static', 'img', 'images',
        'dev', 'staging', 'test', 'demo', 'preview', 'beta',
        'echo', // Reserved for Reverb WebSocket server
    ];

    /**
     * Get admin-configured blocked subdomains from database.
     */
    public static function getBlockedSubdomains(): array
    {
        $blocked = SystemSetting::get('domain_blocked_subdomains', []);

        if (is_string($blocked)) {
            $blocked = json_decode($blocked, true) ?? [];
        }

        return array_map('strtolower', array_filter($blocked));
    }

    /**
     * Get all blocked subdomains (reserved + admin-configured).
     */
    public static function getAllBlockedSubdomains(): array
    {
        return array_unique(array_merge(
            self::RESERVED_SUBDOMAINS,
            self::getBlockedSubdomains()
        ));
    }

    /**
     * Validate a subdomain string.
     *
     * @return array<string> Array of validation errors (empty if valid)
     */
    public static function validate(string $subdomain): array
    {
        $errors = [];

        if (strlen($subdomain) < 3) {
            $errors[] = 'Subdomain must be at least 3 characters.';
        }

        if (strlen($subdomain) > 63) {
            $errors[] = 'Subdomain must be 63 characters or less.';
        }

        if (! preg_match('/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/', $subdomain)) {
            $errors[] = 'Subdomain must start and end with a letter or number, and contain only lowercase letters, numbers, and hyphens.';
        }

        if (str_contains($subdomain, '--')) {
            $errors[] = 'Subdomain cannot contain consecutive hyphens.';
        }

        if (in_array(strtolower($subdomain), self::getAllBlockedSubdomains(), true)) {
            $errors[] = 'This subdomain is reserved and cannot be used.';
        }

        return $errors;
    }

    /**
     * Check if subdomain is available.
     */
    public static function isAvailable(string $subdomain, ?string $excludeProjectId = null): bool
    {
        $query = Project::where('subdomain', $subdomain);

        if ($excludeProjectId) {
            $query->where('id', '!=', $excludeProjectId);
        }

        return ! $query->exists();
    }

    /**
     * Generate a unique subdomain from a string.
     */
    public static function generateFromString(string $input): string
    {
        $base = Str::slug($input);
        $base = substr($base, 0, 50);

        if (empty($base)) {
            $base = 'project';
        }

        $base = trim($base, '-');
        $subdomain = $base;
        $counter = 1;

        while (! self::isAvailable($subdomain) || in_array($subdomain, self::getAllBlockedSubdomains(), true)) {
            $subdomain = "{$base}-{$counter}";
            $counter++;

            if ($counter > 100) {
                $subdomain = $base.'-'.Str::random(6);
                break;
            }
        }

        return $subdomain;
    }

    /**
     * Normalize subdomain (lowercase, trim).
     */
    public static function normalize(string $subdomain): string
    {
        return strtolower(trim($subdomain));
    }
}
