<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ChecksDemoMode;
use App\Models\AiProvider;
use App\Models\Builder;
use App\Models\Plan;
use App\Models\SystemSetting;
use App\Services\BroadcastService;
use App\Services\FirebaseAdminService;
use App\Services\InternalAiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class SettingsController extends Controller
{
    use ChecksDemoMode;

    /**
     * Display settings page with all groups.
     */
    public function index(Request $request)
    {
        return Inertia::render('Admin/Settings', [
            'settings' => [
                'general' => $this->getGeneralSettings(),
                'plans' => $this->getPlansSettings(),
                'referral' => $this->getReferralSettings(),
                'domains' => $this->getDomainSettings(),
                'auth' => $this->getAuthSettings(),
                'email' => $this->getEmailSettings(),
                'gdpr' => $this->getGdprSettings(),
                'integrations' => $this->getIntegrationSettings(),
            ],
            'plans' => Plan::where('is_active', true)->get(['id', 'name', 'price', 'billing_period']),
            'aiProviders' => AiProvider::active()->orderBy('name')->get(['id', 'name', 'type']),
            'builders' => Builder::active()->orderBy('name')->get(['id', 'name']),
            'notificationEvents' => $this->getNotificationEventOptions(),
        ]);
    }

    /**
     * Update general settings.
     */
    public function updateGeneral(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'site_name' => 'required|string|max:255',
            'site_description' => 'nullable|string|max:500',
            'site_tagline' => 'nullable|string|max:100',
            'default_theme' => 'required|in:light,dark,system',
            'color_theme' => 'required|in:neutral,blue,green,orange,red,rose,violet,yellow',
            'default_locale' => 'required|string|max:10',
            'timezone' => 'required|string|timezone',
            'date_format' => 'required|string|max:50',
            'landing_page_enabled' => 'boolean',
            'default_currency' => 'required|string|size:3|in:'.implode(',', \App\Helpers\CurrencyHelper::getSupportedCurrencies()),
            'sentry_enabled' => 'nullable|boolean',
            'purchase_code' => 'nullable|string|max:255',
        ]);

        // Don't overwrite purchase code if empty (keep existing)
        if (empty($validated['purchase_code'])) {
            unset($validated['purchase_code']);
        }

        SystemSetting::setMany($validated, 'general');

        return back()->with('success', 'General settings updated successfully.');
    }

    /**
     * Upload logo or favicon.
     */
    public function uploadBranding(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $request->validate([
            'type' => 'required|in:logo,logo_dark,favicon',
            'file' => 'required|image|mimes:png,jpg,jpeg,svg,ico|max:2048',
        ]);

        $type = $request->input('type');
        $file = $request->file('file');
        $settingKey = "site_{$type}";

        // Delete old file if exists
        $oldPath = SystemSetting::get($settingKey);
        if ($oldPath && Storage::disk('public')->exists($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        // Store new file
        $path = $file->store('branding', 'public');

        SystemSetting::set($settingKey, $path, 'string', 'general');

        return back()->with('success', ucfirst(str_replace('_', ' ', $type)).' uploaded successfully.');
    }

    /**
     * Delete branding file (logo or favicon).
     */
    public function deleteBranding(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $request->validate([
            'type' => 'required|in:logo,logo_dark,favicon',
        ]);

        $type = $request->input('type');
        $settingKey = "site_{$type}";

        $path = SystemSetting::get($settingKey);
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }

        // Delete the setting entirely
        SystemSetting::where('key', $settingKey)->delete();
        \Illuminate\Support\Facades\Cache::forget("setting.{$settingKey}");
        \Illuminate\Support\Facades\Cache::forget('settings.group.general');

        return back()->with('success', ucfirst(str_replace('_', ' ', $type)).' removed successfully.');
    }

    /**
     * Update plans settings.
     */
    public function updatePlans(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'default_plan_id' => 'nullable|exists:plans,id',
            'default_ai_provider_id' => 'nullable|exists:ai_providers,id',
            'default_builder_id' => 'nullable|exists:builders,id',
        ]);

        // Handle nullable integer settings - need to set each one individually
        // to properly handle null values (clearing defaults)
        $this->setNullableIntegerSetting('default_plan_id', $validated, 'plans');
        $this->setNullableIntegerSetting('default_ai_provider_id', $validated, 'plans');
        $this->setNullableIntegerSetting('default_builder_id', $validated, 'plans');

        return back()->with('success', 'Plans settings updated successfully.');
    }

    /**
     * Update auth/social login settings.
     */
    public function updateAuth(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'enable_registration' => 'boolean',
            'require_email_verification' => 'boolean',
            'recaptcha_enabled' => 'boolean',
            'recaptcha_site_key' => 'nullable|string|max:255',
            'recaptcha_secret_key' => 'nullable|string|max:255',
            'google_login_enabled' => 'boolean',
            'google_client_id' => 'nullable|string|max:255',
            'google_client_secret' => 'nullable|string|max:255',
            'facebook_login_enabled' => 'boolean',
            'facebook_client_id' => 'nullable|string|max:255',
            'facebook_client_secret' => 'nullable|string|max:255',
            'github_login_enabled' => 'boolean',
            'github_client_id' => 'nullable|string|max:255',
            'github_client_secret' => 'nullable|string|max:255',
            'session_timeout' => 'required|integer|min:5|max:1440',
            'password_min_length' => 'required|integer|min:6|max:128',
        ]);

        // Handle secrets - don't overwrite if empty (keep existing)
        $secretFields = ['recaptcha_secret_key', 'google_client_secret', 'facebook_client_secret', 'github_client_secret'];
        foreach ($secretFields as $field) {
            if (empty($validated[$field])) {
                unset($validated[$field]);
            }
        }

        SystemSetting::setMany($validated, 'auth');

        return back()->with('success', 'Authentication settings updated successfully.');
    }

    /**
     * Update email settings.
     */
    public function updateEmail(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'mail_mailer' => 'required|in:smtp,sendmail',
            'smtp_host' => 'nullable|string|max:255',
            'smtp_port' => 'nullable|integer|min:1|max:65535',
            'smtp_username' => 'nullable|string|max:255',
            'smtp_password' => 'nullable|string|max:255',
            'smtp_encryption' => 'nullable|in:tls,ssl,none',
            'mail_from_address' => 'required|email|max:255',
            'mail_from_name' => 'required|string|max:255',
            'admin_notification_email' => 'nullable|email|max:255',
            'admin_notification_events' => 'nullable|array',
        ]);

        // Don't overwrite password if empty
        if (empty($validated['smtp_password'])) {
            unset($validated['smtp_password']);
        }

        SystemSetting::setMany($validated, 'email');

        return back()->with('success', 'Email settings updated successfully.');
    }

    /**
     * Test email configuration.
     */
    public function testEmail(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'email' => 'required|email',
        ]);

        try {
            // Apply current settings to mail config
            $this->applyMailConfig();

            Mail::raw('This is a test email from your '.config('app.name').' application. Your email configuration is working correctly!', function ($message) use ($validated) {
                $message->to($validated['email'])
                    ->subject(config('app.name').' Test Email');
            });

            return back()->with('success', 'Test email sent successfully to '.$validated['email']);
        } catch (\Exception $e) {
            return back()->withErrors(['email' => 'Failed to send test email: '.$e->getMessage()]);
        }
    }

    /**
     * Update GDPR/privacy settings.
     */
    public function updateGdpr(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'privacy_policy_version' => 'required|string|max:20',
            'terms_policy_version' => 'required|string|max:20',
            'cookie_policy_version' => 'required|string|max:20',
            'data_retention_days_transactions' => 'required|integer|min:365',
            'data_retention_days_inactive_accounts' => 'required|integer|min:30',
            'data_retention_days_projects' => 'required|integer|min:7',
            'data_retention_days_audit_logs' => 'required|integer|min:30',
            'data_retention_days_exports' => 'required|integer|min:1',
            'account_deletion_grace_days' => 'required|integer|min:1|max:30',
            'data_export_rate_limit_hours' => 'required|integer|min:1',
            'cookie_consent_enabled' => 'boolean',
            'data_export_enabled' => 'boolean',
            'account_deletion_enabled' => 'boolean',
        ]);

        SystemSetting::setMany($validated, 'gdpr');

        return back()->with('success', 'Privacy settings updated successfully.');
    }

    /**
     * Get general settings.
     */
    protected function getGeneralSettings(): array
    {
        $settings = SystemSetting::getGroup('general');

        return [
            'site_name' => $settings['site_name'] ?? config('app.name'),
            'site_description' => $settings['site_description'] ?? '',
            'site_tagline' => $settings['site_tagline'] ?? '',
            'site_logo' => $settings['site_logo'] ?? null,
            'site_logo_dark' => $settings['site_logo_dark'] ?? null,
            'site_favicon' => $settings['site_favicon'] ?? null,
            'default_theme' => $settings['default_theme'] ?? 'system',
            'color_theme' => $settings['color_theme'] ?? 'neutral',
            'default_locale' => $settings['default_locale'] ?? 'en',
            'timezone' => $settings['timezone'] ?? 'UTC',
            'date_format' => $settings['date_format'] ?? 'Y-m-d',
            'landing_page_enabled' => $settings['landing_page_enabled'] ?? true,
            'default_currency' => $settings['default_currency'] ?? 'USD',
            'sentry_enabled' => $settings['sentry_enabled'] ?? false,
            'purchase_code_configured' => ! empty($settings['purchase_code']),
        ];
    }

    /**
     * Get plans settings.
     */
    protected function getPlansSettings(): array
    {
        $settings = SystemSetting::getGroup('plans');

        return [
            'default_plan_id' => $settings['default_plan_id'] ?? null,
            'default_ai_provider_id' => $settings['default_ai_provider_id'] ?? null,
            'default_builder_id' => $settings['default_builder_id'] ?? null,
        ];
    }

    /**
     * Get referral settings.
     */
    protected function getReferralSettings(): array
    {
        $settings = SystemSetting::getGroup('referral');

        return [
            'referral_enabled' => (bool) ($settings['referral_enabled'] ?? true),
            'referral_commission_percent' => (int) ($settings['referral_commission_percent'] ?? 20),
            'referral_signup_bonus' => (float) ($settings['referral_signup_bonus'] ?? 0),
            'referral_referee_signup_bonus' => (int) ($settings['referral_referee_signup_bonus'] ?? 0),
            'referral_min_redemption' => (float) ($settings['referral_min_redemption'] ?? 5.00),
        ];
    }

    /**
     * Get domain settings.
     */
    protected function getDomainSettings(): array
    {
        $settings = SystemSetting::getGroup('domains');

        $blockedSubdomains = $settings['domain_blocked_subdomains'] ?? [];
        if (is_string($blockedSubdomains)) {
            $blockedSubdomains = json_decode($blockedSubdomains, true) ?? [];
        }

        return [
            'domain_enable_subdomains' => (bool) ($settings['domain_enable_subdomains'] ?? false),
            'domain_enable_custom_domains' => (bool) ($settings['domain_enable_custom_domains'] ?? false),
            'domain_base_domain' => $settings['domain_base_domain'] ?? '',
            'domain_server_ip' => $settings['domain_server_ip'] ?? '',
            'domain_blocked_subdomains' => $blockedSubdomains,
        ];
    }

    /**
     * Update domain settings.
     */
    public function updateDomains(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'domain_enable_subdomains' => 'boolean',
            'domain_enable_custom_domains' => 'boolean',
            'domain_base_domain' => 'nullable|string|max:255',
            'domain_server_ip' => ['nullable', 'string', 'ip'],
            'domain_blocked_subdomains' => 'nullable|array',
            'domain_blocked_subdomains.*' => 'string|max:63',
        ]);

        // Normalize base domain - remove protocol, trailing slash, etc.
        if (! empty($validated['domain_base_domain'])) {
            $validated['domain_base_domain'] = \App\Support\CustomDomainHelper::normalize($validated['domain_base_domain']);
        }

        // Normalize blocked subdomains
        if (! empty($validated['domain_blocked_subdomains'])) {
            $validated['domain_blocked_subdomains'] = array_values(array_unique(
                array_map('strtolower', array_filter($validated['domain_blocked_subdomains']))
            ));
        } else {
            $validated['domain_blocked_subdomains'] = [];
        }

        SystemSetting::setMany($validated, 'domains');

        // Clear domain settings cache
        \App\Services\DomainSettingService::clearCache();

        return back()->with('success', 'Domain settings updated successfully.');
    }

    /**
     * Update referral settings.
     */
    public function updateReferral(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'referral_enabled' => 'boolean',
            'referral_commission_percent' => 'required|integer|min:0|max:100',
            'referral_signup_bonus' => 'required|numeric|min:0',
            'referral_referee_signup_bonus' => 'required|integer|min:0',
            'referral_min_redemption' => 'required|numeric|min:0',
        ]);

        SystemSetting::setMany($validated, 'referral');

        return back()->with('success', 'Referral settings updated successfully.');
    }

    /**
     * Get auth settings with secret indicators.
     */
    protected function getAuthSettings(): array
    {
        $settings = SystemSetting::getGroup('auth');

        $result = [
            'enable_registration' => $settings['enable_registration'] ?? true,
            'require_email_verification' => $settings['require_email_verification'] ?? true,
            'recaptcha_enabled' => $settings['recaptcha_enabled'] ?? false,
            'recaptcha_site_key' => $settings['recaptcha_site_key'] ?? '',
            'recaptcha_has_secret' => ! empty($settings['recaptcha_secret_key']),
            'google_login_enabled' => $settings['google_login_enabled'] ?? false,
            'google_client_id' => $settings['google_client_id'] ?? '',
            'google_has_secret' => ! empty($settings['google_client_secret']),
            'facebook_login_enabled' => $settings['facebook_login_enabled'] ?? false,
            'facebook_client_id' => $settings['facebook_client_id'] ?? '',
            'facebook_has_secret' => ! empty($settings['facebook_client_secret']),
            'github_login_enabled' => $settings['github_login_enabled'] ?? false,
            'github_client_id' => $settings['github_client_id'] ?? '',
            'github_has_secret' => ! empty($settings['github_client_secret']),
            'session_timeout' => $settings['session_timeout'] ?? 120,
            'password_min_length' => $settings['password_min_length'] ?? 8,
        ];

        if (config('app.demo')) {
            $mask = '********';
            $result['recaptcha_site_key'] = $mask;
            $result['google_client_id'] = $mask;
            $result['facebook_client_id'] = $mask;
            $result['github_client_id'] = $mask;
        }

        return $result;
    }

    /**
     * Get email settings.
     */
    protected function getEmailSettings(): array
    {
        $settings = SystemSetting::getGroup('email');

        $result = [
            'mail_mailer' => $settings['mail_mailer'] ?? 'smtp',
            'smtp_host' => $settings['smtp_host'] ?? '',
            'smtp_port' => $settings['smtp_port'] ?? 587,
            'smtp_username' => $settings['smtp_username'] ?? '',
            'smtp_has_password' => ! empty($settings['smtp_password']),
            'smtp_encryption' => $settings['smtp_encryption'] ?? 'tls',
            'mail_from_address' => $settings['mail_from_address'] ?? '',
            'mail_from_name' => $settings['mail_from_name'] ?? config('app.name'),
            'admin_notification_email' => $settings['admin_notification_email'] ?? '',
            'admin_notification_events' => $settings['admin_notification_events'] ?? [],
        ];

        if (config('app.demo')) {
            $mask = '********';
            $result['smtp_host'] = $mask;
            $result['smtp_username'] = $mask;
            $result['mail_from_address'] = $mask;
            $result['admin_notification_email'] = $mask;
        }

        return $result;
    }

    /**
     * Get GDPR settings.
     */
    protected function getGdprSettings(): array
    {
        $settings = SystemSetting::getGroup('gdpr');

        return [
            'privacy_policy_version' => $settings['privacy_policy_version'] ?? '1.0',
            'terms_policy_version' => $settings['terms_policy_version'] ?? '1.0',
            'cookie_policy_version' => $settings['cookie_policy_version'] ?? '1.0',
            'data_retention_days_transactions' => $settings['data_retention_days_transactions'] ?? 2555,
            'data_retention_days_inactive_accounts' => $settings['data_retention_days_inactive_accounts'] ?? 730,
            'data_retention_days_projects' => $settings['data_retention_days_projects'] ?? 90,
            'data_retention_days_audit_logs' => $settings['data_retention_days_audit_logs'] ?? 365,
            'data_retention_days_exports' => $settings['data_retention_days_exports'] ?? 7,
            'account_deletion_grace_days' => $settings['account_deletion_grace_days'] ?? 7,
            'data_export_rate_limit_hours' => $settings['data_export_rate_limit_hours'] ?? 24,
            'cookie_consent_enabled' => $settings['cookie_consent_enabled'] ?? true,
            'data_export_enabled' => $settings['data_export_enabled'] ?? true,
            'account_deletion_enabled' => $settings['account_deletion_enabled'] ?? true,
        ];
    }

    /**
     * Get notification event options.
     */
    protected function getNotificationEventOptions(): array
    {
        return [
            ['value' => 'user_registered', 'label' => __('New User Registration')],
            ['value' => 'user_deleted', 'label' => __('User Account Deleted')],
            ['value' => 'subscription_activated', 'label' => __('Subscription Activated')],
            ['value' => 'subscription_cancelled', 'label' => __('Subscription Cancelled')],
            ['value' => 'subscription_expired', 'label' => __('Subscription Expired')],
            ['value' => 'payment_completed', 'label' => __('Payment Completed')],
            ['value' => 'bank_transfer_pending', 'label' => __('Bank Transfer Pending')],
        ];
    }

    /**
     * Update integration settings.
     */
    public function updateIntegrations(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'broadcast_driver' => 'nullable|string|in:pusher,reverb',
            'pusher_app_id' => 'nullable|string|max:255',
            'pusher_key' => 'nullable|string|max:255',
            'pusher_secret' => 'nullable|string|max:255',
            'pusher_cluster' => 'nullable|string|in:mt1,us2,us3,eu,ap1,ap2,ap3,ap4',
            'reverb_host' => 'nullable|required_if:broadcast_driver,reverb|string|max:255',
            'reverb_port' => 'nullable|integer|min:1|max:65535',
            'reverb_scheme' => 'nullable|string|in:http,https',
            'reverb_app_id' => 'nullable|string|max:255',
            'reverb_key' => 'nullable|string|max:255',
            'reverb_secret' => 'nullable|string|max:255',
            'internal_ai_provider_id' => 'nullable|exists:ai_providers,id',
            'internal_ai_model' => 'nullable|string|max:100',
            // Firebase validation
            'firebase_system_api_key' => 'nullable|string|max:255',
            'firebase_system_project_id' => 'nullable|string|max:255',
            'firebase_system_auth_domain' => 'nullable|string|max:255',
            'firebase_system_storage_bucket' => 'nullable|string|max:255',
            'firebase_system_messaging_sender_id' => 'nullable|string|max:255',
            'firebase_system_app_id' => 'nullable|string|max:255',
        ]);

        // Don't overwrite secrets if empty (keep existing)
        foreach (['pusher_key', 'pusher_secret', 'reverb_key', 'reverb_secret', 'firebase_system_api_key'] as $field) {
            if (empty($validated[$field])) {
                unset($validated[$field]);
            }
        }

        // Handle nullable integer for internal_ai_provider_id
        $this->setNullableIntegerSetting('internal_ai_provider_id', $validated, 'integrations');
        unset($validated['internal_ai_provider_id']);

        // Handle internal_ai_model - allow empty string to clear
        if (array_key_exists('internal_ai_model', $validated)) {
            if (empty($validated['internal_ai_model'])) {
                SystemSetting::where('key', 'internal_ai_model')->delete();
                \Illuminate\Support\Facades\Cache::forget('setting.internal_ai_model');
                \Illuminate\Support\Facades\Cache::forget('settings.group.integrations');
            } else {
                SystemSetting::set('internal_ai_model', $validated['internal_ai_model'], 'string', 'integrations');
            }
            unset($validated['internal_ai_model']);
        }

        SystemSetting::setMany($validated, 'integrations');

        // Clear caches when settings change
        InternalAiService::clearAllCache();
        BroadcastService::clearCache();

        return back()->with('success', 'Integration settings updated successfully.');
    }

    /**
     * Test broadcast connection (Pusher or Reverb).
     */
    public function testBroadcast(Request $request)
    {
        if (config('app.demo')) {
            return response()->json(['success' => false, 'error' => 'This action is disabled in demo mode.'], 403);
        }

        $validated = $request->validate([
            'driver' => 'required|in:pusher,reverb',
            'app_id' => 'required|string',
            'key' => 'required|string',
            'secret' => 'required|string',
            'cluster' => 'nullable|string',
            'host' => 'nullable|string',
            'port' => 'nullable|integer',
            'scheme' => 'nullable|in:http,https',
        ]);

        // Fall back to saved credentials when placeholder values are sent
        if ($validated['key'] === '[existing]' || $validated['secret'] === '[existing]') {
            $settings = SystemSetting::getGroup('integrations');
            if ($validated['driver'] === 'reverb') {
                $validated['key'] = $validated['key'] === '[existing]' ? ($settings['reverb_key'] ?? '') : $validated['key'];
                $validated['secret'] = $validated['secret'] === '[existing]' ? ($settings['reverb_secret'] ?? '') : $validated['secret'];
            } else {
                $validated['key'] = $validated['key'] === '[existing]' ? ($settings['pusher_key'] ?? '') : $validated['key'];
                $validated['secret'] = $validated['secret'] === '[existing]' ? ($settings['pusher_secret'] ?? '') : $validated['secret'];
            }
        }

        try {
            $options = ['useTLS' => true];

            if ($validated['driver'] === 'reverb') {
                $scheme = $validated['scheme'] ?? 'https';
                $options['host'] = $validated['host'] ?? 'localhost';
                $options['port'] = $validated['port'] ?? 8080;
                $options['scheme'] = $scheme;
                $options['useTLS'] = $scheme === 'https';
            } else {
                $options['cluster'] = $validated['cluster'] ?? 'mt1';
            }

            $pusher = new \Pusher\Pusher(
                $validated['key'],
                $validated['secret'],
                $validated['app_id'],
                $options
            );

            // Use trigger on a test channel - works reliably with both Pusher and Reverb
            $pusher->trigger('broadcast-connection-test', 'test', ['ping' => true]);

            return response()->json(['success' => true]);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'error' => $e->getMessage()], 422);
        }
    }

    /**
     * Test Firebase connection.
     */
    public function testFirebase(Request $request, \App\Services\FirebaseService $firebaseService)
    {
        if (config('app.demo')) {
            return response()->json(['success' => false, 'error' => 'This action is disabled in demo mode.'], 403);
        }

        $validated = $request->validate([
            'api_key' => 'nullable|string',
            'project_id' => 'required|string',
        ]);

        // If api_key is not provided or is placeholder, use saved key
        $apiKey = $validated['api_key'];
        if (empty($apiKey) || $apiKey === '[existing]') {
            $settings = SystemSetting::getGroup('integrations');
            $apiKey = $settings['firebase_system_api_key'] ?? '';
        }

        if (empty($apiKey)) {
            return response()->json([
                'success' => false,
                'error' => 'API key is required',
            ], 422);
        }

        $result = $firebaseService->testConnection([
            'apiKey' => $apiKey,
            'projectId' => $validated['project_id'],
        ]);

        if ($result['success']) {
            return response()->json(['success' => true]);
        }

        return response()->json([
            'success' => false,
            'error' => $result['error'] ?? 'Connection failed',
        ], 422);
    }

    /**
     * Upload Firebase Admin SDK service account JSON.
     */
    public function uploadFirebaseAdmin(Request $request, FirebaseAdminService $service)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $request->validate([
            'file' => 'required|file|max:50', // 50KB max
        ]);

        $file = $request->file('file');

        // Validate file extension
        if ($file->getClientOriginalExtension() !== 'json') {
            return back()->withErrors(['file' => 'File must be a JSON file']);
        }

        $json = json_decode(file_get_contents($file->path()), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return back()->withErrors(['file' => 'Invalid JSON file']);
        }

        // Validate structure
        $validation = $service->validateServiceAccount($json);
        if (! $validation['valid']) {
            return back()->withErrors(['file' => implode(', ', $validation['errors'])]);
        }

        // Store credentials
        $service->setServiceAccount($json);

        // Test connection
        $result = $service->testConnection();
        if (! $result['success']) {
            $service->removeServiceAccount();

            return back()->withErrors(['file' => 'Connection test failed: '.$result['error']]);
        }

        return back()->with('success', 'Firebase Admin SDK configured successfully');
    }

    /**
     * Test Firebase Admin SDK connection.
     */
    public function testFirebaseAdmin(FirebaseAdminService $service)
    {
        if (config('app.demo')) {
            return response()->json(['success' => false, 'error' => 'This action is disabled in demo mode.'], 403);
        }

        $result = $service->testConnection();

        if ($result['success']) {
            return response()->json(['success' => true]);
        }

        return response()->json(['success' => false, 'error' => $result['error']], 422);
    }

    /**
     * Delete Firebase Admin SDK credentials.
     */
    public function deleteFirebaseAdmin(FirebaseAdminService $service)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $service->removeServiceAccount();

        return back()->with('success', 'Firebase Admin SDK credentials removed');
    }

    /**
     * Get integration settings.
     */
    protected function getIntegrationSettings(): array
    {
        $settings = SystemSetting::getGroup('integrations');

        $result = [
            'broadcast_driver' => $settings['broadcast_driver'] ?? 'pusher',
            'pusher_app_id' => $settings['pusher_app_id'] ?? '',
            'pusher_has_key' => ! empty($settings['pusher_key']),
            'pusher_has_secret' => ! empty($settings['pusher_secret']),
            'pusher_cluster' => $settings['pusher_cluster'] ?? 'mt1',
            'reverb_host' => $settings['reverb_host'] ?? '',
            'reverb_port' => (int) ($settings['reverb_port'] ?? 8080),
            'reverb_scheme' => $settings['reverb_scheme'] ?? 'https',
            'reverb_app_id' => $settings['reverb_app_id'] ?? '',
            'reverb_has_key' => ! empty($settings['reverb_key']),
            'reverb_has_secret' => ! empty($settings['reverb_secret']),
            'internal_ai_provider_id' => $settings['internal_ai_provider_id'] ?? null,
            'internal_ai_model' => $settings['internal_ai_model'] ?? '',
            // Firebase fields
            'firebase_system_project_id' => $settings['firebase_system_project_id'] ?? '',
            'firebase_system_auth_domain' => $settings['firebase_system_auth_domain'] ?? '',
            'firebase_system_storage_bucket' => $settings['firebase_system_storage_bucket'] ?? '',
            'firebase_system_messaging_sender_id' => $settings['firebase_system_messaging_sender_id'] ?? '',
            'firebase_system_app_id' => $settings['firebase_system_app_id'] ?? '',
            'firebase_has_api_key' => ! empty($settings['firebase_system_api_key']),
            'firebase_configured' => ! empty($settings['firebase_system_api_key']) && ! empty($settings['firebase_system_project_id']),
            // Firebase Admin SDK status
            'firebase_admin_configured' => app(FirebaseAdminService::class)->isConfigured(),
            'firebase_admin_project_id' => app(FirebaseAdminService::class)->getProjectInfo()['project_id'] ?? null,
            'firebase_admin_client_email' => app(FirebaseAdminService::class)->getProjectInfo()['client_email'] ?? null,
        ];

        if (config('app.demo')) {
            $mask = '********';
            $result['pusher_app_id'] = $mask;
            $result['reverb_host'] = $mask;
            $result['reverb_app_id'] = $mask;
            $result['firebase_system_project_id'] = $mask;
            $result['firebase_system_auth_domain'] = $mask;
            $result['firebase_system_storage_bucket'] = $mask;
            $result['firebase_system_messaging_sender_id'] = $mask;
            $result['firebase_system_app_id'] = $mask;
            $result['firebase_admin_client_email'] = $mask;
            $result['firebase_admin_project_id'] = $mask;
        }

        return $result;
    }

    /**
     * Apply mail configuration from settings.
     */
    protected function applyMailConfig(): void
    {
        $settings = SystemSetting::getGroup('email');

        config([
            'mail.default' => $settings['mail_mailer'] ?? 'smtp',
            'mail.mailers.smtp.host' => $settings['smtp_host'] ?? '',
            'mail.mailers.smtp.port' => $settings['smtp_port'] ?? 587,
            'mail.mailers.smtp.username' => $settings['smtp_username'] ?? null,
            'mail.mailers.smtp.password' => $settings['smtp_password'] ?? null,
            'mail.mailers.smtp.encryption' => $settings['smtp_encryption'] === 'none' ? null : ($settings['smtp_encryption'] ?? 'tls'),
            'mail.from.address' => $settings['mail_from_address'] ?? null,
            'mail.from.name' => $settings['mail_from_name'] ?? config('app.name'),
        ]);
    }

    /**
     * Set or clear a nullable integer setting.
     *
     * If the value is null, the setting is deleted entirely.
     * Otherwise, the value is stored as an integer.
     */
    protected function setNullableIntegerSetting(string $key, array $validated, string $group): void
    {
        if (! array_key_exists($key, $validated)) {
            return;
        }

        $value = $validated[$key];

        if ($value === null) {
            // Delete the setting and clear cache
            SystemSetting::where('key', $key)->delete();
            \Illuminate\Support\Facades\Cache::forget("setting.{$key}");
            \Illuminate\Support\Facades\Cache::forget("settings.group.{$group}");
        } else {
            SystemSetting::set($key, $value, 'integer', $group);
        }
    }

    /**
     * Check which active payment gateways support a given currency.
     */
    public function checkCurrencyCompatibility(string $currency): \Illuminate\Http\JsonResponse
    {
        $currency = strtoupper($currency);

        if (strlen($currency) !== 3) {
            return response()->json(['error' => 'Invalid currency code'], 400);
        }

        return response()->json(
            \App\Helpers\CurrencyHelper::checkGatewayCompatibility($currency)
        );
    }
}
