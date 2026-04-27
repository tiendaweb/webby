import { PageProps } from '@/types';

export type ColorTheme = 'neutral' | 'blue' | 'green' | 'orange' | 'red' | 'rose' | 'violet' | 'yellow';

export interface GeneralSettings {
    site_name: string;
    site_description: string;
    site_tagline: string;
    site_logo: string | null;
    site_logo_dark: string | null;
    site_favicon: string | null;
    default_theme: 'light' | 'dark' | 'system';
    color_theme: ColorTheme;
    default_locale: string;
    timezone: string;
    date_format: string;
    landing_page_enabled: boolean;
    default_currency: string;
    sentry_enabled: boolean;
    purchase_code_configured: boolean;
}

export interface PlansSettings {
    default_plan_id: number | null;
    default_ai_provider_id: number | null;
    default_builder_id: number | null;
}

export interface AiProvider {
    id: number;
    name: string;
    type: string;
}

export interface Builder {
    id: number;
    name: string;
}

export interface AuthSettings {
    enable_registration: boolean;
    require_email_verification: boolean;
    recaptcha_enabled: boolean;
    recaptcha_site_key: string;
    recaptcha_has_secret: boolean;
    google_login_enabled: boolean;
    google_client_id: string;
    google_has_secret: boolean;
    facebook_login_enabled: boolean;
    facebook_client_id: string;
    facebook_has_secret: boolean;
    github_login_enabled: boolean;
    github_client_id: string;
    github_has_secret: boolean;
    session_timeout: number;
    password_min_length: number;
}

export type MailDriver = 'smtp' | 'sendmail';
export type MailEncryption = 'tls' | 'ssl' | 'none';

export interface EmailSettings {
    mail_mailer: MailDriver;
    smtp_host: string;
    smtp_port: number;
    smtp_username: string;
    smtp_has_password: boolean;
    smtp_encryption: MailEncryption;
    mail_from_address: string;
    mail_from_name: string;
    admin_notification_email: string;
    admin_notification_events: string[];
}

export interface GdprSettings {
    privacy_policy_version: string;
    terms_policy_version: string;
    cookie_policy_version: string;
    data_retention_days_transactions: number;
    data_retention_days_inactive_accounts: number;
    data_retention_days_projects: number;
    data_retention_days_audit_logs: number;
    data_retention_days_exports: number;
    account_deletion_grace_days: number;
    data_export_rate_limit_hours: number;
    cookie_consent_enabled: boolean;
    data_export_enabled: boolean;
    account_deletion_enabled: boolean;
}

export type BroadcastDriver = 'pusher' | 'reverb';
export type PusherCluster = 'mt1' | 'us2' | 'us3' | 'eu' | 'ap1' | 'ap2' | 'ap3' | 'ap4';
export type ReverbScheme = 'http' | 'https';

export interface IntegrationSettings {
    broadcast_driver: BroadcastDriver;
    pusher_app_id: string;
    pusher_has_key: boolean;
    pusher_has_secret: boolean;
    pusher_cluster: PusherCluster;
    reverb_host: string;
    reverb_port: number;
    reverb_scheme: ReverbScheme;
    reverb_app_id: string;
    reverb_has_key: boolean;
    reverb_has_secret: boolean;
    internal_ai_provider_id: number | null;
    internal_ai_model: string;
    // Firebase fields
    firebase_system_project_id: string;
    firebase_system_auth_domain: string;
    firebase_system_storage_bucket: string;
    firebase_system_messaging_sender_id: string;
    firebase_system_app_id: string;
    firebase_has_api_key: boolean;
    firebase_configured: boolean;
    // Firebase Admin SDK
    firebase_admin_configured: boolean;
    firebase_admin_project_id: string | null;
    firebase_admin_client_email: string | null;
}

export interface ReferralSettings {
    referral_enabled: boolean;
    referral_commission_percent: number;
    referral_signup_bonus: number;
    referral_referee_signup_bonus: number;
    referral_min_redemption: number;
}

export interface DomainSettings {
    domain_enable_subdomains: boolean;
    domain_enable_custom_domains: boolean;
    domain_base_domain: string;
    domain_server_ip: string;
    domain_blocked_subdomains: string[];
}

export interface AllSettings {
    general: GeneralSettings;
    plans: PlansSettings;
    referral: ReferralSettings;
    domains: DomainSettings;
    auth: AuthSettings;
    email: EmailSettings;
    gdpr: GdprSettings;
    integrations: IntegrationSettings;
}

export interface Plan {
    id: number;
    name: string;
    price: number;
    billing_period: string;
}

export interface NotificationEvent {
    value: string;
    label: string;
}

export interface SettingsPageProps extends PageProps {
    settings: AllSettings;
    plans: Plan[];
    aiProviders: AiProvider[];
    builders: Builder[];
    notificationEvents: NotificationEvent[];
}
