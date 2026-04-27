<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BroadcastService
{
    /**
     * Cache key for broadcast health status.
     */
    protected const CACHE_KEY = 'broadcast:health_status';

    /**
     * Cache TTL in seconds (2 minutes).
     */
    protected const CACHE_TTL = 120;

    /**
     * Check if broadcast is configured and working.
     * Results are cached for 2 minutes.
     *
     * @param  bool  $forceCheck  Skip cache and force a new check
     * @return array{configured: bool, working: bool, error: string|null}
     */
    public function checkHealth(bool $forceCheck = false): array
    {
        if (! $forceCheck) {
            $cached = Cache::get(self::CACHE_KEY);
            if ($cached !== null) {
                return $cached;
            }
        }

        $settings = SystemSetting::getGroup('integrations');
        $driver = $settings['broadcast_driver'] ?? 'pusher';

        // Check if configured
        if ($driver === 'reverb') {
            $isConfigured = ! empty($settings['reverb_key'] ?? '');
        } else {
            $isConfigured = ! empty($settings['pusher_key'] ?? '');
        }

        if (! $isConfigured) {
            $result = [
                'configured' => false,
                'working' => false,
                'error' => 'Broadcast credentials are not configured.',
            ];
            Cache::put(self::CACHE_KEY, $result, self::CACHE_TTL);

            return $result;
        }

        // Test the connection
        $testResult = $this->testConnection($settings, $driver);

        $result = [
            'configured' => true,
            'working' => $testResult['success'],
            'error' => $testResult['error'],
        ];

        Cache::put(self::CACHE_KEY, $result, self::CACHE_TTL);

        return $result;
    }

    /**
     * Test the actual broadcast connection.
     */
    protected function testConnection(array $settings, string $driver): array
    {
        try {
            if ($driver === 'reverb') {
                return $this->testReverbConnection($settings);
            }

            return $this->testPusherConnection($settings);
        } catch (\Exception $e) {
            Log::warning('Broadcast connection test failed', [
                'driver' => $driver,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => 'Connection test failed: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Test Pusher connection by hitting the channels endpoint.
     */
    protected function testPusherConnection(array $settings): array
    {
        $appId = $settings['pusher_app_id'] ?? '';
        $key = $settings['pusher_key'] ?? '';
        $secret = $settings['pusher_secret'] ?? '';
        $cluster = $settings['pusher_cluster'] ?? 'mt1';

        if (empty($appId) || empty($key) || empty($secret)) {
            return [
                'success' => false,
                'error' => 'Pusher credentials are incomplete.',
            ];
        }

        // Use Pusher REST API to check connection
        $host = "api-{$cluster}.pusher.com";
        $path = "/apps/{$appId}/channels";
        $timestamp = time();

        $params = [
            'auth_key' => $key,
            'auth_timestamp' => $timestamp,
            'auth_version' => '1.0',
        ];

        ksort($params);
        $queryString = http_build_query($params);
        $signatureString = "GET\n{$path}\n{$queryString}";
        $signature = hash_hmac('sha256', $signatureString, $secret);

        $url = "https://{$host}{$path}?{$queryString}&auth_signature={$signature}";

        $response = Http::timeout(5)->get($url);

        if ($response->successful()) {
            return ['success' => true, 'error' => null];
        }

        return [
            'success' => false,
            'error' => 'Pusher API returned: '.$response->status().' - '.$response->body(),
        ];
    }

    /**
     * Test Reverb connection by hitting the health endpoint or channels.
     */
    protected function testReverbConnection(array $settings): array
    {
        $host = $settings['reverb_host'] ?? '';
        $port = $settings['reverb_port'] ?? 8080;
        $scheme = $settings['reverb_scheme'] ?? 'https';
        $appId = $settings['reverb_app_id'] ?? '';
        $key = $settings['reverb_key'] ?? '';
        $secret = $settings['reverb_secret'] ?? '';

        if (empty($host) || empty($key) || empty($secret)) {
            return [
                'success' => false,
                'error' => 'Reverb credentials are incomplete.',
            ];
        }

        // Test by hitting the apps endpoint (simpler health check)
        $path = "/apps/{$appId}/channels";
        $timestamp = time();

        $params = [
            'auth_key' => $key,
            'auth_timestamp' => $timestamp,
            'auth_version' => '1.0',
        ];

        ksort($params);
        $queryString = http_build_query($params);
        $signatureString = "GET\n{$path}\n{$queryString}";
        $signature = hash_hmac('sha256', $signatureString, $secret);

        $url = "{$scheme}://{$host}:{$port}{$path}?{$queryString}&auth_signature={$signature}";

        $response = Http::timeout(5)->get($url);

        if ($response->successful()) {
            return ['success' => true, 'error' => null];
        }

        // Check if it's a connection refused error
        if ($response->status() === 0) {
            return [
                'success' => false,
                'error' => 'Cannot connect to Reverb server. Make sure the Reverb server is running.',
            ];
        }

        return [
            'success' => false,
            'error' => 'Reverb API returned: '.$response->status(),
        ];
    }

    /**
     * Clear the cached health status.
     */
    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Quick check if broadcast is ready (configured and working).
     */
    public function isReady(): bool
    {
        $health = $this->checkHealth();

        return $health['configured'] && $health['working'];
    }

    /**
     * Check if broadcast credentials are configured (no connection test).
     */
    public function isConfigured(): bool
    {
        $settings = SystemSetting::getGroup('integrations');
        $driver = $settings['broadcast_driver'] ?? 'pusher';

        if ($driver === 'reverb') {
            return ! empty($settings['reverb_key'] ?? '');
        }

        return ! empty($settings['pusher_key'] ?? '');
    }

    /**
     * Get user-friendly error message for display.
     */
    public function getErrorMessage(): ?string
    {
        $health = $this->checkHealth();

        if (! $health['configured']) {
            return 'Real-time features are not configured. Please configure broadcast settings in Admin Settings → Integrations.';
        }

        if (! $health['working']) {
            return 'Real-time server is not responding. Please check that your broadcast server (Pusher/Reverb) is running and credentials are correct.';
        }

        return null;
    }
}
