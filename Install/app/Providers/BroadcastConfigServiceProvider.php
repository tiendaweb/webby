<?php

namespace App\Providers;

use App\Models\SystemSetting;
use Illuminate\Support\ServiceProvider;

class BroadcastConfigServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     *
     * Load broadcasting settings from database into config.
     */
    public function boot(): void
    {
        // Only load if the database is available (skip during migrations, etc.)
        if (! $this->app->runningInConsole() || $this->app->runningUnitTests()) {
            $this->loadBroadcastConfig();
        }

        // Also load for queue workers that need to broadcast
        if ($this->app->runningInConsole()) {
            try {
                $this->loadBroadcastConfig();
            } catch (\Exception $e) {
                // Database might not be available yet (during migrations)
            }
        }
    }

    /**
     * Load broadcast configuration from database.
     * Supports both Pusher (default) and Reverb (self-hosted) drivers.
     * All config comes from admin/settings (system_settings table), not .env.
     */
    protected function loadBroadcastConfig(): void
    {
        try {
            $settings = SystemSetting::getGroup('integrations');
            $driver = $settings['broadcast_driver'] ?? 'pusher';

            if ($driver === 'reverb' && ! empty($settings['reverb_key'])) {
                $scheme = $settings['reverb_scheme'] ?? 'http';
                $host = $settings['reverb_host'] ?? 'localhost';
                $port = (int) ($settings['reverb_port'] ?? 8080);

                // Server-side broadcasting client: connect to Reverb directly on
                // localhost to avoid TLS/DNS issues. The public host/port/scheme
                // from settings are only used by the frontend JS client.
                $serverHost = $settings['reverb_server_host'] ?? '127.0.0.1';
                $serverPort = (int) ($settings['reverb_server_port'] ?? 8892);

                config(['broadcasting.default' => 'reverb']);
                config(['broadcasting.connections.reverb.key' => $settings['reverb_key']]);
                config(['broadcasting.connections.reverb.secret' => $settings['reverb_secret'] ?? '']);
                config(['broadcasting.connections.reverb.app_id' => $settings['reverb_app_id'] ?? '']);
                config(['broadcasting.connections.reverb.options.host' => $serverHost]);
                config(['broadcasting.connections.reverb.options.port' => $serverPort]);
                config(['broadcasting.connections.reverb.options.scheme' => 'http']);
                config(['broadcasting.connections.reverb.options.useTLS' => false]);

                // Reverb server binding config (where the server listens)
                config(['reverb.servers.reverb.port' => $serverPort]);
                config(['reverb.servers.reverb.hostname' => '0.0.0.0']);

                // Reverb server app config (what credentials the server accepts)
                config(['reverb.apps.apps' => [[
                    'key' => $settings['reverb_key'],
                    'secret' => $settings['reverb_secret'] ?? '',
                    'app_id' => $settings['reverb_app_id'] ?? '',
                    'options' => [
                        'host' => $serverHost,
                        'port' => $serverPort,
                        'scheme' => 'http',
                        'useTLS' => false,
                    ],
                    'allowed_origins' => ['*'],
                    'ping_interval' => 60,
                    'activity_timeout' => 30,
                    'max_message_size' => 10000,
                ]]]);
            } elseif (! empty($settings['pusher_key'])) {
                config(['broadcasting.default' => 'pusher']);

                config(['broadcasting.connections.pusher.key' => $settings['pusher_key']]);

                if (! empty($settings['pusher_secret'])) {
                    config(['broadcasting.connections.pusher.secret' => $settings['pusher_secret']]);
                }
                if (! empty($settings['pusher_app_id'])) {
                    config(['broadcasting.connections.pusher.app_id' => $settings['pusher_app_id']]);
                }
                if (! empty($settings['pusher_cluster'])) {
                    config(['broadcasting.connections.pusher.options.cluster' => $settings['pusher_cluster']]);
                    config([
                        'broadcasting.connections.pusher.options.host' => 'api-'.$settings['pusher_cluster'].'.pusher.com',
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Silently fail if database is not available
        }
    }
}
