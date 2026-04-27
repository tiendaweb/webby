<?php

namespace App\Support;

use App\Models\Project;

class CustomDomainHelper
{
    /**
     * TLDs that are not allowed for custom domains.
     */
    public const BLOCKED_TLDS = ['localhost', 'local', 'test', 'invalid', 'example', 'internal'];

    /**
     * Validate a custom domain string.
     *
     * @return array<string> Array of validation errors (empty if valid)
     */
    public static function validate(string $domain): array
    {
        $errors = [];
        $domain = self::normalize($domain);

        if (empty($domain)) {
            $errors[] = 'Domain cannot be empty.';

            return $errors;
        }

        // Check minimum length
        if (strlen($domain) < 4) {
            $errors[] = 'Domain must be at least 4 characters.';
        }

        // Check maximum length
        if (strlen($domain) > 253) {
            $errors[] = 'Domain must be 253 characters or less.';
        }

        // Check valid domain format (basic RFC 1035 validation)
        if (! preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i', $domain)) {
            $errors[] = 'Invalid domain format. Domain must be a valid hostname (e.g., example.com or subdomain.example.com).';
        }

        // Check for blocked TLDs
        $tld = self::extractTld($domain);
        if ($tld && in_array(strtolower($tld), self::BLOCKED_TLDS, true)) {
            $errors[] = 'This domain extension is not allowed.';
        }

        // Check label lengths (each part between dots)
        $labels = explode('.', $domain);
        foreach ($labels as $label) {
            if (strlen($label) > 63) {
                $errors[] = 'Each part of the domain must be 63 characters or less.';
                break;
            }
        }

        return $errors;
    }

    /**
     * Extract TLD from domain.
     */
    public static function extractTld(string $domain): ?string
    {
        $parts = explode('.', $domain);

        return count($parts) > 1 ? end($parts) : null;
    }

    /**
     * Normalize domain (lowercase, trim, remove protocol/trailing slash).
     */
    public static function normalize(string $domain): string
    {
        $domain = strtolower(trim($domain));

        // Remove protocol if present
        $domain = preg_replace('#^https?://#', '', $domain);

        // Remove trailing slash
        $domain = rtrim($domain, '/');

        // Remove path if present
        $domain = explode('/', $domain)[0];

        // Remove port if present
        $domain = explode(':', $domain)[0];

        return $domain;
    }

    /**
     * Check if domain is available.
     */
    public static function isAvailable(string $domain, ?string $excludeProjectId = null): bool
    {
        $domain = self::normalize($domain);

        $query = Project::where('custom_domain', $domain);

        if ($excludeProjectId) {
            $query->where('id', '!=', $excludeProjectId);
        }

        return ! $query->exists();
    }

    /**
     * Check if domain is a subdomain of the base domain.
     */
    public static function isSubdomainOfBase(string $domain, string $baseDomain): bool
    {
        $domain = self::normalize($domain);
        $baseDomain = self::normalize($baseDomain);

        if (empty($baseDomain)) {
            return false;
        }

        // Exact match
        if ($domain === $baseDomain) {
            return true;
        }

        // Check if it ends with .baseDomain
        return str_ends_with($domain, '.'.$baseDomain);
    }
}
