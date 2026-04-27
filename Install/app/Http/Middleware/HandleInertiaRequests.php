<?php

namespace App\Http\Middleware;

use App\Models\Language;
use App\Models\Plan;
use App\Models\SystemSetting;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'csrf_token' => csrf_token(),
            'isDemo' => config('app.demo'),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'bankTransfer' => fn () => $request->session()->get('bankTransfer'),
            ],
            'auth' => [
                'user' => $request->user(),
            ],
            // Recent projects for sidebar
            'recentProjects' => fn () => $request->user()
                ? $request->user()->projects()
                    ->orderByDesc('last_viewed_at')
                    ->limit(5)
                    ->get()
                : null,
            'appSettings' => fn () => [
                'site_name' => SystemSetting::get('site_name', config('app.name')),
                'site_tagline' => SystemSetting::get('site_tagline', ''),
                'site_description' => SystemSetting::get('site_description', ''),
                'site_logo' => SystemSetting::get('site_logo'),
                'site_logo_dark' => SystemSetting::get('site_logo_dark'),
                'site_favicon' => SystemSetting::get('site_favicon'),
                'default_theme' => SystemSetting::get('default_theme', 'system'),
                'color_theme' => SystemSetting::get('color_theme', 'neutral'),
                'default_locale' => SystemSetting::get('default_locale', 'en'),
                'timezone' => SystemSetting::get('timezone', 'UTC'),
                'date_format' => SystemSetting::get('date_format', 'Y-m-d'),
                'landing_page_enabled' => SystemSetting::get('landing_page_enabled', true),
                'cookie_consent_enabled' => SystemSetting::get('cookie_consent_enabled', true),
                'enable_registration' => SystemSetting::get('enable_registration', true),
                'google_login_enabled' => SystemSetting::get('google_login_enabled', false),
                'facebook_login_enabled' => SystemSetting::get('facebook_login_enabled', false),
                'github_login_enabled' => SystemSetting::get('github_login_enabled', false),
                'recaptcha_enabled' => SystemSetting::get('recaptcha_enabled', false),
                'recaptcha_site_key' => SystemSetting::get('recaptcha_enabled', false) ? SystemSetting::get('recaptcha_site_key', '') : '',
                // Pusher settings
                'pusher_key' => SystemSetting::get('pusher_key', ''),
                'pusher_cluster' => SystemSetting::get('pusher_cluster', 'mt1'),
                // Currency settings
                'default_currency' => SystemSetting::get('default_currency', 'USD'),
                'currency_symbol' => \App\Helpers\CurrencyHelper::getSymbol(),
            ],
            'hasUpgradablePlans' => fn () => $this->calculateHasUpgradablePlans($request->user()),
            'translations' => fn () => $this->getTranslations(),
            'locale' => fn () => $this->getLocaleData(),
            // Real-time broadcasting config
            'broadcastConfig' => fn () => $this->getBroadcastConfig(),
            // User credits for header display
            'userCredits' => fn () => $this->getUserCredits($request->user()),
            // Unread notification count for badge
            'unreadNotificationCount' => fn () => $request->user()
                ? UserNotification::where('user_id', $request->user()->id)
                    ->whereNotIn('type', ['build_complete', 'build_failed'])
                    ->unread()
                    ->count()
                : 0,
            'impersonating' => fn () => session('impersonating_from') ? true : null,
        ];
    }

    /**
     * Get broadcast configuration for real-time features.
     */
    private function getBroadcastConfig(): ?array
    {
        try {
            $integrationSettings = SystemSetting::getGroup('integrations');
            $driver = $integrationSettings['broadcast_driver'] ?? 'pusher';

            if ($driver === 'reverb') {
                return [
                    'provider' => 'reverb',
                    'key' => $integrationSettings['reverb_key'] ?? '',
                    'host' => $integrationSettings['reverb_host'] ?? '',
                    'port' => (int) ($integrationSettings['reverb_port'] ?? 8080),
                    'scheme' => $integrationSettings['reverb_scheme'] ?? 'http',
                ];
            }

            return [
                'provider' => 'pusher',
                'key' => $integrationSettings['pusher_key'] ?? '',
                'cluster' => $integrationSettings['pusher_cluster'] ?? 'mt1',
            ];
        } catch (\Exception $e) {
            // Database not available (fresh install)
            return null;
        }
    }

    /**
     * Get user credits for header display.
     */
    private function getUserCredits(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        try {
            return [
                'remaining' => $user->getRemainingBuildCredits(),
                'monthlyLimit' => $user->getMonthlyBuildCreditsAllocation(),
                'isUnlimited' => $user->hasUnlimitedCredits(),
                'usingOwnKey' => $user->isUsingOwnAiApiKey(),
            ];
        } catch (\Exception $e) {
            // Database not available (fresh install)
            return null;
        }
    }

    /**
     * Get translations for the current locale.
     * Merges all JSON files from the locale directory.
     */
    protected function getTranslations(): array
    {
        $locale = app()->getLocale();
        $translations = $this->loadTranslationsFromDirectory($locale);

        // Fallback to English if current locale has no translations
        if (empty($translations) && $locale !== 'en') {
            $translations = $this->loadTranslationsFromDirectory('en');
        }

        return $translations;
    }

    /**
     * Load and merge all JSON translation files from a locale directory.
     */
    protected function loadTranslationsFromDirectory(string $locale): array
    {
        $directory = lang_path($locale);
        $translations = [];

        // Check if directory exists
        if (! is_dir($directory)) {
            // Fallback to single JSON file for backward compatibility
            $singleFile = lang_path("{$locale}.json");
            if (file_exists($singleFile)) {
                return json_decode(file_get_contents($singleFile), true) ?? [];
            }

            return [];
        }

        // Merge all JSON files in the directory
        $files = glob("{$directory}/*.json");
        foreach ($files as $file) {
            $content = json_decode(file_get_contents($file), true);
            if (is_array($content)) {
                $translations = array_merge($translations, $content);
            }
        }

        return $translations;
    }

    /**
     * Calculate whether the user has upgradable plans available.
     */
    private function calculateHasUpgradablePlans(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        try {
            $currentPlan = $user->getCurrentPlan();
            $currentPrice = $currentPlan?->price ?? 0;
            $maxPrice = Plan::active()->max('price') ?? 0;

            return $maxPrice > $currentPrice;
        } catch (\Exception $e) {
            // Database not available (fresh install)
            return false;
        }
    }

    /**
     * Get locale data with fallback for fresh installs.
     */
    protected function getLocaleData(): array
    {
        try {
            return [
                'current' => app()->getLocale(),
                'isRtl' => Language::where('code', app()->getLocale())->value('is_rtl') ?? false,
                'available' => Language::active()->orderBy('sort_order')->get(['code', 'country_code', 'name', 'native_name', 'is_rtl']),
            ];
        } catch (\Exception $e) {
            // Database not available (fresh install)
            return [
                'current' => 'en',
                'isRtl' => false,
                'available' => [],
            ];
        }
    }
}
