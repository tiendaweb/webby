<?php

namespace App\Support;

use App\Models\SystemSetting;

/**
 * Resolves the platform base domains used for subdomain publishing.
 *
 * The platform has one primary base domain (used to build public URLs) and an
 * optional list of alias base domains that serve exactly the same projects.
 * Aliases exist so a domain migration keeps previously published sites reachable
 * on the old domain.
 */
class BaseDomainHelper
{
    /**
     * The primary base domain used when building published URLs.
     */
    public static function primary(): ?string
    {
        $domain = self::sanitize((string) SystemSetting::get('domain_base_domain', ''));

        if ($domain === null) {
            $domain = self::sanitize((string) config('app.base_domain', ''));
        }

        return $domain;
    }

    /**
     * Additional base domains that serve the same published projects.
     *
     * @return array<int, string>
     */
    public static function aliases(): array
    {
        $raw = SystemSetting::get('domain_alias_domains', null);

        if ($raw === null || $raw === '' || $raw === []) {
            $raw = config('app.alias_domains') ?? env('APP_ALIAS_DOMAINS', '');
        }

        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : preg_split('/[\s,;]+/', $raw);
        }

        if (! is_array($raw)) {
            return [];
        }

        $primary = self::primary();
        $aliases = [];

        foreach ($raw as $domain) {
            if (! is_string($domain)) {
                continue;
            }

            $domain = self::sanitize($domain);

            if ($domain === null || $domain === $primary) {
                continue;
            }

            $aliases[] = $domain;
        }

        return array_values(array_unique($aliases));
    }

    /**
     * Every base domain the platform answers on, primary first.
     *
     * @return array<int, string>
     */
    public static function all(): array
    {
        $primary = self::primary();

        return array_values(array_filter(array_merge(
            $primary !== null ? [$primary] : [],
            self::aliases()
        )));
    }

    /**
     * The base domain the given host belongs to, or null when it is unrelated.
     */
    public static function match(string $host): ?string
    {
        $host = self::sanitize($host);

        if ($host === null) {
            return null;
        }

        foreach (self::all() as $baseDomain) {
            if ($host === $baseDomain || str_ends_with($host, ".{$baseDomain}")) {
                return $baseDomain;
            }
        }

        return null;
    }

    /**
     * The subdomain label of a host under any base domain (null when there is none).
     */
    public static function subdomain(string $host): ?string
    {
        $host = self::sanitize($host);
        $baseDomain = $host !== null ? self::match($host) : null;

        if ($baseDomain === null || $host === $baseDomain) {
            return null;
        }

        $subdomain = substr($host, 0, -(strlen($baseDomain) + 1));

        return $subdomain !== '' ? $subdomain : null;
    }

    /**
     * Normalize a domain: lowercase, no scheme, no path, no leading/trailing dots.
     */
    protected static function sanitize(string $domain): ?string
    {
        $domain = strtolower(trim($domain));

        if ($domain === '') {
            return null;
        }

        if (str_contains($domain, '://')) {
            $domain = (string) parse_url($domain, PHP_URL_HOST);
        }

        $domain = trim(explode('/', $domain)[0]);
        $domain = trim($domain, '.');

        return $domain !== '' ? $domain : null;
    }
}
