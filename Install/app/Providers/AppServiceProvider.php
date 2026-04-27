<?php

namespace App\Providers;

use App\Events\Builder\BuilderCompleteEvent;
use App\Events\Builder\BuilderErrorEvent;
use App\Events\Builder\BuilderStatusEvent;
use App\Listeners\SyncProjectBuildStatus;
use App\Listeners\TrackBuildCreditUsage;
use App\Models\Project;
use App\Models\Subscription;
use App\Models\SystemSetting;
use App\Models\Transaction;
use App\Models\User;
use App\Observers\ProjectObserver;
use App\Observers\SubscriptionObserver;
use App\Observers\TransactionObserver;
use App\Observers\UserObserver;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Translation\Translator;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Register custom JSON translation loader for lang/{locale}/*.json files
        $this->registerJsonTranslations();

        // Register model observers
        Project::observe(ProjectObserver::class);
        Subscription::observe(SubscriptionObserver::class);
        Transaction::observe(TransactionObserver::class);
        User::observe(UserObserver::class);

        // Register event listeners
        Event::listen(BuilderCompleteEvent::class, TrackBuildCreditUsage::class);
        Event::listen(BuilderCompleteEvent::class, [SyncProjectBuildStatus::class, 'handleComplete']);
        Event::listen(BuilderStatusEvent::class, SyncProjectBuildStatus::class);
        Event::listen(BuilderErrorEvent::class, [SyncProjectBuildStatus::class, 'handleError']);

        // Only configure dynamic settings if the database is available
        try {
            if (! Schema::hasTable('system_settings')) {
                return;
            }

            $this->configureSessionTimeout();
            $this->configureSessionDomain();
            $this->configureMailSettings();
            $this->configureSocialiteProviders();
            $this->configureFirebaseSettings();
        } catch (\Exception $e) {
            // Database not available yet (fresh install)
            return;
        }
    }

    /**
     * Apply dynamic session timeout from settings.
     */
    protected function configureSessionTimeout(): void
    {
        try {
            $timeout = SystemSetting::get('session_timeout', 120);
            config(['session.lifetime' => (int) $timeout]);
        } catch (\Exception $e) {
            // Ignore if settings table doesn't exist yet
        }
    }

    /**
     * Apply dynamic session cookie domain for cross-subdomain auth.
     * When subdomains are enabled, set cookie domain to .baseDomain
     * so auth works on dashboard.domain.com, app.domain.com, etc.
     */
    protected function configureSessionDomain(): void
    {
        try {
            if (SystemSetting::get('domain_enable_subdomains', false)) {
                $baseDomain = SystemSetting::get('domain_base_domain', '');
                if (! empty($baseDomain)) {
                    $domain = ltrim($baseDomain, '.');

                    // Only set the wildcard session domain when the request
                    // host actually matches the base domain. Otherwise the
                    // browser scopes the cookie to a domain that doesn't
                    // match the current host, causing 419 CSRF errors.
                    $host = request()->getHost();
                    if ($host === $domain || str_ends_with($host, ".{$domain}")) {
                        config(['session.domain' => ".{$domain}"]);
                    }
                }
            }
        } catch (\Exception $e) {
            // Ignore if settings table doesn't exist yet
        }
    }

    /**
     * Apply dynamic mail configuration from settings.
     */
    protected function configureMailSettings(): void
    {
        try {
            $settings = SystemSetting::getGroup('email');

            if (empty($settings)) {
                return;
            }

            // Only apply if SMTP settings are configured
            if (! empty($settings['smtp_host'])) {
                config([
                    'mail.default' => $settings['mail_mailer'] ?? 'smtp',
                    'mail.mailers.smtp.host' => $settings['smtp_host'] ?? '',
                    'mail.mailers.smtp.port' => (int) ($settings['smtp_port'] ?? 587),
                    'mail.mailers.smtp.username' => $settings['smtp_username'] ?? null,
                    'mail.mailers.smtp.password' => $settings['smtp_password'] ?? null,
                    'mail.mailers.smtp.encryption' => ($settings['smtp_encryption'] ?? 'tls') === 'none'
                        ? null
                        : ($settings['smtp_encryption'] ?? 'tls'),
                ]);
            }

            // Apply from address settings
            if (! empty($settings['mail_from_address'])) {
                config([
                    'mail.from.address' => $settings['mail_from_address'],
                    'mail.from.name' => $settings['mail_from_name'] ?? config('app.name'),
                ]);
            }
        } catch (\Exception $e) {
            // Ignore if settings table doesn't exist yet
        }
    }

    /**
     * Configure Socialite providers from SystemSettings.
     */
    protected function configureSocialiteProviders(): void
    {
        try {
            $providers = ['google', 'facebook', 'github'];

            foreach ($providers as $provider) {
                $enabled = SystemSetting::get("{$provider}_login_enabled", false);

                if ($enabled) {
                    $clientId = SystemSetting::get("{$provider}_client_id", '');
                    $clientSecret = SystemSetting::get("{$provider}_client_secret", '');

                    if ($clientId && $clientSecret) {
                        config([
                            "services.{$provider}.client_id" => $clientId,
                            "services.{$provider}.client_secret" => $clientSecret,
                            "services.{$provider}.redirect" => url("/auth/{$provider}/callback"),
                        ]);
                    }
                }
            }
        } catch (\Exception $e) {
            // Ignore if settings table doesn't exist yet
        }
    }

    /**
     * Configure Firebase settings from database.
     */
    protected function configureFirebaseSettings(): void
    {
        try {
            $settings = SystemSetting::getGroup('integrations');

            // Only override config if Firebase project ID is set in database
            if (! empty($settings['firebase_system_project_id'])) {
                config([
                    'services.firebase.system_api_key' => $settings['firebase_system_api_key'] ?? config('services.firebase.system_api_key'),
                    'services.firebase.system_project_id' => $settings['firebase_system_project_id'] ?? config('services.firebase.system_project_id'),
                    'services.firebase.system_auth_domain' => $settings['firebase_system_auth_domain'] ?? config('services.firebase.system_auth_domain'),
                    'services.firebase.system_storage_bucket' => $settings['firebase_system_storage_bucket'] ?? config('services.firebase.system_storage_bucket'),
                    'services.firebase.system_messaging_sender_id' => $settings['firebase_system_messaging_sender_id'] ?? config('services.firebase.system_messaging_sender_id'),
                    'services.firebase.system_app_id' => $settings['firebase_system_app_id'] ?? config('services.firebase.system_app_id'),
                ]);
            }
        } catch (\Exception $e) {
            // Ignore if settings table doesn't exist yet
        }
    }

    /**
     * Register JSON translations from lang/{locale}/*.json files.
     * Merges all JSON files in each locale directory into the translator.
     */
    protected function registerJsonTranslations(): void
    {
        $langPath = lang_path();

        // Override the translation loader to merge JSON files from locale subdirectories
        $this->app->extend('translation.loader', function ($loader, $app) use ($langPath) {
            return new class($app['files'], $langPath) extends \Illuminate\Translation\FileLoader
            {
                protected string $langPath;

                public function __construct($files, $langPath)
                {
                    parent::__construct($files, $langPath);
                    $this->langPath = $langPath;
                }

                /**
                 * Load JSON translations, merging all JSON files from locale directories.
                 */
                public function load($locale, $group, $namespace = null)
                {
                    // For JSON translations (group is '*')
                    if ($group === '*' && $namespace === '*') {
                        return $this->loadMergedJsonPaths($locale);
                    }

                    return parent::load($locale, $group, $namespace);
                }

                /**
                 * Load JSON translations from locale directory, merging all JSON files.
                 */
                protected function loadMergedJsonPaths($locale): array
                {
                    $translations = [];

                    // First, load the default lang/{locale}.json if it exists
                    $defaultPath = "{$this->langPath}/{$locale}.json";
                    if ($this->files->exists($defaultPath)) {
                        $decoded = json_decode($this->files->get($defaultPath), true);
                        if (is_array($decoded)) {
                            $translations = array_merge($translations, $decoded);
                        }
                    }

                    // Then, load all JSON files from lang/{locale}/ directory
                    $directory = "{$this->langPath}/{$locale}";
                    if (is_dir($directory)) {
                        $files = glob("{$directory}/*.json");
                        foreach ($files as $file) {
                            $decoded = json_decode($this->files->get($file), true);
                            if (is_array($decoded)) {
                                $translations = array_merge($translations, $decoded);
                            }
                        }
                    }

                    return $translations;
                }
            };
        });
    }
}
