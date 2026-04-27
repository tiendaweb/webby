import type {
    Subscription,
    Transaction,
    Plan,
    Plugin,
    SubscriptionStats,
    TransactionStats,
    PlanStats,
    SubscriptionFilters,
    TransactionFilters,
    PaginatedResponse,
} from './billing';
import type { PageProps } from './index';

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'user';
    status: 'active' | 'inactive';
    projects_count: number;
    created_at: string;
    // Extended fields for subscription management
    active_subscription?: Subscription | null;
    plan?: Plan | null;
}

export interface PaginationData {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

// Re-export billing types for backwards compatibility
export type { Subscription, Transaction, Plan, Plugin } from './billing';

// Admin Page Props
export interface AdminSubscriptionsPageProps extends PageProps {
    subscriptions: PaginatedResponse<Subscription>;
    stats: SubscriptionStats;
    plans: Plan[];
    filters: SubscriptionFilters;
}

export interface AdminSubscriptionDetailsPageProps extends PageProps {
    subscription: Subscription;
}

export interface AdminTransactionsPageProps extends PageProps {
    transactions: PaginatedResponse<Transaction>;
    stats: TransactionStats;
    filters: TransactionFilters;
}

export interface AdminPlansPageProps extends PageProps {
    plans: Plan[];
    stats: PlanStats;
    filters: {
        search?: string;
        status?: string;
    };
}

export interface AdminPluginsPageProps extends PageProps {
    plugins: Plugin[];
}

export interface Language {
    id: number;
    code: string;
    country_code: string;
    name: string;
    native_name: string;
    is_rtl: boolean;
    is_active: boolean;
    is_default: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface AdminLanguagesPageProps extends PageProps {
    languages: Language[];
    availableLocales: string[];
}

export interface Cronjob {
    name: string;
    class: string;
    command: string;
    schedule: string;
    cron: string;
    description: string;
    last_run: string | null;
    last_status: 'success' | 'failed' | 'running' | 'pending';
    next_run: string;
}

export interface CronLog {
    id: number;
    job_name: string;
    job_class: string;
    status: 'success' | 'failed' | 'running';
    started_at: string;
    completed_at: string | null;
    duration: number | null;
    human_duration: string;
    triggered_by: string;
    trigger_display: string;
    message: string | null;
    exception: string | null;
    created_at: string;
}

export interface CronLogsResponse {
    data: CronLog[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

export interface AdminStats {
    total_users: number;
    active_subscriptions: number;
    revenue_mtd: number;
    total_projects: number;
}

// Overview Dashboard Types
export interface OverviewStats {
    total_users: number;
    active_subscriptions: number;
    mrr: number;
    revenue_mtd: number;
    total_projects: number;
}

export interface ChangeMetric {
    value: number;
    trend: 'up' | 'down' | 'neutral';
}

export interface ChangeMetrics {
    users: ChangeMetric;
    subscriptions: ChangeMetric;
    revenue: ChangeMetric;
    projects: ChangeMetric;
}

export interface RecentUser {
    id: number;
    name: string;
    email: string;
    created_at: string;
}

export interface RecentTransaction {
    id: string;
    user: string;
    amount: number;
    status: 'completed' | 'pending' | 'failed' | 'refunded';
    created_at: string;
}

export interface SubscriptionDistributionItem {
    name: string;
    count: number;
    color: string;
}

export interface RevenueByMethod {
    method: string;
    amount: number;
}

export interface AiUsageStats {
    total_tokens: number;
    estimated_cost: number;
    request_count: number;
    unique_users: number;
    own_key_users: number;
    platform_users: number;
}

export interface AiUsageByProvider {
    provider: string;
    tokens: number;
    cost: number;
}

export interface AiUsageTrendItem {
    date: string;
    tokens: number;
    cost: number;
}

export interface ReferralStats {
    total: number;
    converted: number;
    credited: number;
    commission_paid: number;
    pending_earnings: number;
}

export interface TrendDataItem {
    date: string;
    value: number;
}

export interface TrendData {
    revenue: TrendDataItem[];
    users: TrendDataItem[];
    projects: TrendDataItem[];
}

export interface StorageByType {
    type: string;
    size_bytes: number;
    count: number;
}

export interface TopStorageUser {
    id: number;
    name: string;
    email: string;
    storage_bytes: number;
}

export interface StorageStats {
    total_storage_bytes: number;
    total_files: number;
    projects_with_files: number;
    top_users: TopStorageUser[];
    storage_by_type: StorageByType[];
}

export interface FirebaseConnectionStatus {
    connected: boolean;
    error: string | null;
}

export interface FirebaseStats {
    system_configured: boolean;
    system_status: FirebaseConnectionStatus;
    admin_sdk_configured: boolean;
    admin_sdk_status: FirebaseConnectionStatus;
    projects_using_firebase: number;
    projects_with_custom_firebase: number;
    projects_with_admin_sdk: number;
}

export interface OverviewPageProps extends PageProps {
    stats: OverviewStats;
    changes: ChangeMetrics;
    recentUsers: RecentUser[];
    recentTransactions: RecentTransaction[];
    subscriptionDistribution: SubscriptionDistributionItem[];
    revenueByPaymentMethod: RevenueByMethod[];
    aiUsage: AiUsageStats;
    aiUsageByProvider: AiUsageByProvider[];
    aiUsageTrend: AiUsageTrendItem[];
    referralStats: ReferralStats;
    storageStats: StorageStats;
    firebaseStats: FirebaseStats;
    trends: TrendData;
}

// Builder types
export interface Builder {
    id: number;
    name: string;
    url: string;
    port: number;
    server_key: string;
    status: 'active' | 'inactive';
    max_iterations: number;
    last_triggered_at: string | null;
    created_at: string;
    updated_at: string;
    projects_count?: number;
}

export interface BuilderDetails {
    version: string;
    sessions: number;
    online: boolean;
}

// AI Provider types
export type AiProviderType = 'openai' | 'anthropic' | 'grok' | 'deepseek' | 'zhipu';

export interface AiProvider {
    id: number;
    name: string;
    type: AiProviderType;
    type_label: string;
    status: 'active' | 'inactive';
    has_credentials: boolean;
    available_models: string[];
    config: AiProviderConfig;
    plans_count?: number;
    total_requests: number;
    last_used_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface AiProviderConfig {
    base_url?: string;
    default_model?: string;
    max_tokens?: number;
    summarizer_max_tokens?: number;
    organization_id?: string;
    provider_type?: AiProviderType;
}

export interface AiProviderFormData {
    name: string;
    type: AiProviderType;
    api_key?: string;
    base_url?: string;
    default_model?: string;
    max_tokens?: number;
    summarizer_max_tokens?: number;
    available_models?: string[];
    provider_type?: AiProviderType;
}
