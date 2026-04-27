<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class SystemSettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // Installation (auto-complete in local/testing)
            ['key' => 'installation_completed', 'value' => app()->environment(['local', 'testing']) ? '1' : '0', 'type' => 'boolean', 'group' => 'general'],

            // General Settings
            ['key' => 'site_name', 'value' => 'Webby', 'type' => 'string', 'group' => 'general'],
            ['key' => 'site_description', 'value' => 'AI-powered website builder', 'type' => 'string', 'group' => 'general'],
            ['key' => 'site_tagline', 'value' => 'Build websites with AI', 'type' => 'string', 'group' => 'general'],
            ['key' => 'site_logo', 'value' => null, 'type' => 'string', 'group' => 'general'],
            ['key' => 'site_logo_dark', 'value' => null, 'type' => 'string', 'group' => 'general'],
            ['key' => 'site_favicon', 'value' => null, 'type' => 'string', 'group' => 'general'],
            ['key' => 'default_theme', 'value' => 'system', 'type' => 'string', 'group' => 'general'],
            ['key' => 'default_locale', 'value' => 'en', 'type' => 'string', 'group' => 'general'],
            ['key' => 'color_theme', 'value' => 'neutral', 'type' => 'string', 'group' => 'general'],
            ['key' => 'timezone', 'value' => 'UTC', 'type' => 'string', 'group' => 'general'],
            ['key' => 'date_format', 'value' => 'Y-m-d', 'type' => 'string', 'group' => 'general'],
            ['key' => 'landing_page_enabled', 'value' => '1', 'type' => 'boolean', 'group' => 'general'],
            ['key' => 'default_currency', 'value' => 'USD', 'type' => 'string', 'group' => 'general'],

            // Plans Settings
            ['key' => 'default_plan_id', 'value' => null, 'type' => 'integer', 'group' => 'plans'],

            // Auth Settings
            ['key' => 'enable_registration', 'value' => '1', 'type' => 'boolean', 'group' => 'auth'],
            ['key' => 'require_email_verification', 'value' => '1', 'type' => 'boolean', 'group' => 'auth'],
            ['key' => 'recaptcha_enabled', 'value' => '0', 'type' => 'boolean', 'group' => 'auth'],
            ['key' => 'recaptcha_site_key', 'value' => '', 'type' => 'string', 'group' => 'auth'],
            ['key' => 'recaptcha_secret_key', 'value' => '', 'type' => 'string', 'group' => 'auth'],
            ['key' => 'google_login_enabled', 'value' => '0', 'type' => 'boolean', 'group' => 'auth'],
            ['key' => 'google_client_id', 'value' => '', 'type' => 'string', 'group' => 'auth'],
            ['key' => 'google_client_secret', 'value' => '', 'type' => 'string', 'group' => 'auth'],
            ['key' => 'facebook_login_enabled', 'value' => '0', 'type' => 'boolean', 'group' => 'auth'],
            ['key' => 'facebook_client_id', 'value' => '', 'type' => 'string', 'group' => 'auth'],
            ['key' => 'facebook_client_secret', 'value' => '', 'type' => 'string', 'group' => 'auth'],
            ['key' => 'github_login_enabled', 'value' => '0', 'type' => 'boolean', 'group' => 'auth'],
            ['key' => 'github_client_id', 'value' => '', 'type' => 'string', 'group' => 'auth'],
            ['key' => 'github_client_secret', 'value' => '', 'type' => 'string', 'group' => 'auth'],
            ['key' => 'session_timeout', 'value' => '120', 'type' => 'integer', 'group' => 'auth'],
            ['key' => 'password_min_length', 'value' => '8', 'type' => 'integer', 'group' => 'auth'],

            // Email Settings
            ['key' => 'mail_mailer', 'value' => 'smtp', 'type' => 'string', 'group' => 'email'],
            ['key' => 'smtp_host', 'value' => '', 'type' => 'string', 'group' => 'email'],
            ['key' => 'smtp_port', 'value' => '587', 'type' => 'integer', 'group' => 'email'],
            ['key' => 'smtp_username', 'value' => '', 'type' => 'string', 'group' => 'email'],
            ['key' => 'smtp_password', 'value' => '', 'type' => 'string', 'group' => 'email'],
            ['key' => 'smtp_encryption', 'value' => 'tls', 'type' => 'string', 'group' => 'email'],
            ['key' => 'mail_from_address', 'value' => 'noreply@example.com', 'type' => 'string', 'group' => 'email'],
            ['key' => 'mail_from_name', 'value' => 'Webby', 'type' => 'string', 'group' => 'email'],
            ['key' => 'admin_notification_email', 'value' => '', 'type' => 'string', 'group' => 'email'],
            ['key' => 'admin_notification_events', 'value' => '[]', 'type' => 'json', 'group' => 'email'],

            // Referral Settings (disabled by default)
            ['key' => 'referral_enabled', 'value' => '0', 'type' => 'boolean', 'group' => 'referral'],
            ['key' => 'referral_commission_percent', 'value' => '20', 'type' => 'integer', 'group' => 'referral'],
            ['key' => 'referral_commission_type', 'value' => 'first_payment', 'type' => 'string', 'group' => 'referral'],
            ['key' => 'referral_recurring_months', 'value' => '12', 'type' => 'integer', 'group' => 'referral'],
            ['key' => 'referral_signup_bonus', 'value' => '0', 'type' => 'string', 'group' => 'referral'],
            ['key' => 'referral_referee_signup_bonus', 'value' => '0', 'type' => 'integer', 'group' => 'referral'],
            ['key' => 'referral_referee_discount', 'value' => '0', 'type' => 'string', 'group' => 'referral'],
            ['key' => 'referral_min_redemption', 'value' => '5.00', 'type' => 'string', 'group' => 'referral'],
            ['key' => 'referral_discount_scope', 'value' => 'first_payment', 'type' => 'string', 'group' => 'referral'],
            ['key' => 'referral_cookie_days', 'value' => '30', 'type' => 'integer', 'group' => 'referral'],
            ['key' => 'referral_self_referral_blocked', 'value' => '1', 'type' => 'boolean', 'group' => 'referral'],

            // Domain Settings (disabled by default - web installer)
            ['key' => 'domain_enable_subdomains', 'value' => '0', 'type' => 'boolean', 'group' => 'domains'],
            ['key' => 'domain_enable_custom_domains', 'value' => '0', 'type' => 'boolean', 'group' => 'domains'],
            ['key' => 'domain_base_domain', 'value' => '', 'type' => 'string', 'group' => 'domains'],
            ['key' => 'domain_server_ip', 'value' => '', 'type' => 'string', 'group' => 'domains'],

            // GDPR/Privacy Settings
            ['key' => 'privacy_policy_version', 'value' => '1.0', 'type' => 'string', 'group' => 'gdpr'],
            ['key' => 'terms_policy_version', 'value' => '1.0', 'type' => 'string', 'group' => 'gdpr'],
            ['key' => 'cookie_policy_version', 'value' => '1.0', 'type' => 'string', 'group' => 'gdpr'],
            ['key' => 'data_retention_days_transactions', 'value' => '2555', 'type' => 'integer', 'group' => 'gdpr'],
            ['key' => 'data_retention_days_inactive_accounts', 'value' => '730', 'type' => 'integer', 'group' => 'gdpr'],
            ['key' => 'data_retention_days_projects', 'value' => '90', 'type' => 'integer', 'group' => 'gdpr'],
            ['key' => 'data_retention_days_audit_logs', 'value' => '365', 'type' => 'integer', 'group' => 'gdpr'],
            ['key' => 'data_retention_days_exports', 'value' => '7', 'type' => 'integer', 'group' => 'gdpr'],
            ['key' => 'account_deletion_grace_days', 'value' => '7', 'type' => 'integer', 'group' => 'gdpr'],
            ['key' => 'data_export_rate_limit_hours', 'value' => '24', 'type' => 'integer', 'group' => 'gdpr'],
            ['key' => 'cookie_consent_enabled', 'value' => '1', 'type' => 'boolean', 'group' => 'gdpr'],
            ['key' => 'data_export_enabled', 'value' => '1', 'type' => 'boolean', 'group' => 'gdpr'],
            ['key' => 'account_deletion_enabled', 'value' => '1', 'type' => 'boolean', 'group' => 'gdpr'],
        ];

        foreach ($settings as $setting) {
            SystemSetting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }
}
