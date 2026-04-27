<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;

class DomainSettingService
{
    /**
     * Check if subdomain publishing is enabled globally.
     */
    public function isSubdomainsEnabled(): bool
    {
        return (bool) $this->getSetting('domain_enable_subdomains', false);
    }

    /**
     * Check if custom domain publishing is enabled globally.
     */
    public function isCustomDomainsEnabled(): bool
    {
        return (bool) $this->getSetting('domain_enable_custom_domains', false);
    }

    /**
     * Get the base domain for subdomain publishing.
     */
    public function getBaseDomain(): ?string
    {
        $domain = $this->getSetting('domain_base_domain', '');

        return ! empty($domain) ? $domain : null;
    }

    /**
     * Get the server IP address for A record instructions.
     */
    public function getServerIp(): ?string
    {
        $ip = $this->getSetting('domain_server_ip', '');

        return ! empty($ip) ? $ip : null;
    }

    /**
     * Check if Let's Encrypt SSL is configured.
     * Always returns true - Let's Encrypt is the only supported option.
     */
    public function usesLetsEncrypt(): bool
    {
        return true;
    }

    /**
     * Get all domain settings as an array.
     */
    public function getAllSettings(): array
    {
        return [
            'enable_subdomains' => $this->isSubdomainsEnabled(),
            'enable_custom_domains' => $this->isCustomDomainsEnabled(),
            'base_domain' => $this->getBaseDomain(),
            'server_ip' => $this->getServerIp(),
        ];
    }

    /**
     * Get a single setting value with caching.
     */
    protected function getSetting(string $key, mixed $default = null): mixed
    {
        return SystemSetting::get($key, $default);
    }

    /**
     * Clear the domain settings cache.
     */
    public static function clearCache(): void
    {
        Cache::forget('setting.domain_enable_subdomains');
        Cache::forget('setting.domain_enable_custom_domains');
        Cache::forget('setting.domain_base_domain');
        Cache::forget('setting.domain_server_ip');
        Cache::forget('settings.group.domains');
    }
}
