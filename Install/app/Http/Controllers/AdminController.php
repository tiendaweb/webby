<?php

namespace App\Http\Controllers;

use App\Http\Traits\ChecksDemoMode;
use App\Services\AdminStatsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    use ChecksDemoMode;

    public function __construct(
        protected AdminStatsService $statsService
    ) {}

    public function overview(Request $request): Response
    {
        $stats = $this->statsService->getAllStats();

        $versionFile = base_path('.version');
        $appVersion = file_exists($versionFile) ? trim(file_get_contents($versionFile)) : null;

        return Inertia::render('Admin/Overview', [
            'user' => $request->user()->only('id', 'name', 'email', 'avatar', 'role'),
            'appVersion' => $appVersion,
            'stats' => $stats['core'],
            'changes' => $stats['changes'],
            'pending' => $stats['pending'],
            'subscriptionDistribution' => $stats['subscriptionDistribution'],
            'revenueByPaymentMethod' => $stats['revenueByPaymentMethod'],
            'aiUsage' => $stats['aiUsage'],
            'aiUsageByProvider' => $stats['aiUsageByProvider'],
            'aiUsageTrend' => $stats['aiUsageTrend'],
            'referralStats' => $stats['referralStats'],
            'storageStats' => $stats['storageStats'],
            'firebaseStats' => $stats['firebaseStats'],
            'trends' => $stats['trends'],
            'recentUsers' => $this->statsService->getRecentUsers(),
            'recentTransactions' => $this->statsService->getRecentTransactions(),
        ]);
    }

    public function refreshStats(): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $this->statsService->clearCache();

        return back();
    }

    public function users(Request $request): Response
    {
        return Inertia::render('Admin/Users', [
            'user' => $request->user()->only('id', 'name', 'email', 'avatar', 'role'),
            'users' => [
                ['id' => 1, 'name' => 'John Doe', 'email' => 'john@example.com', 'role' => 'admin', 'status' => 'active', 'projects_count' => 5, 'created_at' => '2024-01-15'],
                ['id' => 2, 'name' => 'Jane Smith', 'email' => 'jane@example.com', 'role' => 'user', 'status' => 'active', 'projects_count' => 12, 'created_at' => '2024-01-14'],
                ['id' => 3, 'name' => 'Bob Wilson', 'email' => 'bob@example.com', 'role' => 'user', 'status' => 'inactive', 'projects_count' => 3, 'created_at' => '2024-01-13'],
                ['id' => 4, 'name' => 'Alice Brown', 'email' => 'alice@example.com', 'role' => 'user', 'status' => 'active', 'projects_count' => 8, 'created_at' => '2024-01-12'],
                ['id' => 5, 'name' => 'Charlie Davis', 'email' => 'charlie@example.com', 'role' => 'user', 'status' => 'active', 'projects_count' => 2, 'created_at' => '2024-01-11'],
                ['id' => 6, 'name' => 'Diana Evans', 'email' => 'diana@example.com', 'role' => 'user', 'status' => 'active', 'projects_count' => 15, 'created_at' => '2024-01-10'],
                ['id' => 7, 'name' => 'Edward Fisher', 'email' => 'edward@example.com', 'role' => 'user', 'status' => 'inactive', 'projects_count' => 0, 'created_at' => '2024-01-09'],
                ['id' => 8, 'name' => 'Fiona Garcia', 'email' => 'fiona@example.com', 'role' => 'admin', 'status' => 'active', 'projects_count' => 7, 'created_at' => '2024-01-08'],
                ['id' => 9, 'name' => 'George Harris', 'email' => 'george@example.com', 'role' => 'user', 'status' => 'active', 'projects_count' => 4, 'created_at' => '2024-01-07'],
                ['id' => 10, 'name' => 'Helen Irving', 'email' => 'helen@example.com', 'role' => 'user', 'status' => 'active', 'projects_count' => 9, 'created_at' => '2024-01-06'],
            ],
        ]);
    }

    public function subscriptions(Request $request): Response
    {
        return Inertia::render('Admin/Subscriptions', [
            'user' => $request->user()->only('id', 'name', 'email', 'avatar', 'role'),
            'subscriptions' => [
                ['id' => 1, 'user' => ['name' => 'John Doe', 'email' => 'john@example.com'], 'plan' => 'Pro', 'status' => 'active', 'started_at' => '2024-01-01', 'expires_at' => '2024-02-01'],
                ['id' => 2, 'user' => ['name' => 'Jane Smith', 'email' => 'jane@example.com'], 'plan' => 'Enterprise', 'status' => 'active', 'started_at' => '2023-12-15', 'expires_at' => '2024-12-15'],
                ['id' => 3, 'user' => ['name' => 'Bob Wilson', 'email' => 'bob@example.com'], 'plan' => 'Pro', 'status' => 'cancelled', 'started_at' => '2023-11-01', 'expires_at' => '2024-01-01'],
                ['id' => 4, 'user' => ['name' => 'Alice Brown', 'email' => 'alice@example.com'], 'plan' => 'Starter', 'status' => 'active', 'started_at' => '2024-01-10', 'expires_at' => '2024-02-10'],
                ['id' => 5, 'user' => ['name' => 'Charlie Davis', 'email' => 'charlie@example.com'], 'plan' => 'Pro', 'status' => 'expired', 'started_at' => '2023-10-01', 'expires_at' => '2023-11-01'],
                ['id' => 6, 'user' => ['name' => 'Diana Evans', 'email' => 'diana@example.com'], 'plan' => 'Enterprise', 'status' => 'active', 'started_at' => '2024-01-05', 'expires_at' => '2025-01-05'],
            ],
        ]);
    }

    public function transactions(Request $request): Response
    {
        return Inertia::render('Admin/Transactions', [
            'user' => $request->user()->only('id', 'name', 'email', 'avatar', 'role'),
            'transactions' => [
                ['id' => 'TXN001', 'user' => ['name' => 'John Doe'], 'amount' => 29.99, 'type' => 'subscription', 'status' => 'completed', 'created_at' => '2024-01-15 10:30:00'],
                ['id' => 'TXN002', 'user' => ['name' => 'Jane Smith'], 'amount' => 99.99, 'type' => 'subscription', 'status' => 'completed', 'created_at' => '2024-01-15 09:15:00'],
                ['id' => 'TXN003', 'user' => ['name' => 'Bob Wilson'], 'amount' => 29.99, 'type' => 'subscription', 'status' => 'pending', 'created_at' => '2024-01-14 16:45:00'],
                ['id' => 'TXN004', 'user' => ['name' => 'Alice Brown'], 'amount' => 199.99, 'type' => 'subscription', 'status' => 'completed', 'created_at' => '2024-01-14 14:20:00'],
                ['id' => 'TXN005', 'user' => ['name' => 'Charlie Davis'], 'amount' => 29.99, 'type' => 'subscription', 'status' => 'failed', 'created_at' => '2024-01-14 11:00:00'],
                ['id' => 'TXN006', 'user' => ['name' => 'Diana Evans'], 'amount' => 499.99, 'type' => 'one-time', 'status' => 'completed', 'created_at' => '2024-01-13 15:30:00'],
                ['id' => 'TXN007', 'user' => ['name' => 'Edward Fisher'], 'amount' => 29.99, 'type' => 'subscription', 'status' => 'completed', 'created_at' => '2024-01-13 12:00:00'],
                ['id' => 'TXN008', 'user' => ['name' => 'Fiona Garcia'], 'amount' => 99.99, 'type' => 'subscription', 'status' => 'completed', 'created_at' => '2024-01-12 18:45:00'],
            ],
        ]);
    }

    public function plans(Request $request): Response
    {
        return Inertia::render('Admin/Plans', [
            'user' => $request->user()->only('id', 'name', 'email', 'avatar', 'role'),
            'plans' => [
                [
                    'id' => 1,
                    'name' => 'Starter',
                    'price' => 9.99,
                    'billing_cycle' => 'monthly',
                    'features' => ['5 Projects', '1GB Storage', 'Basic Support', 'API Access'],
                    'subscribers_count' => 234,
                ],
                [
                    'id' => 2,
                    'name' => 'Pro',
                    'price' => 29.99,
                    'billing_cycle' => 'monthly',
                    'features' => ['Unlimited Projects', '10GB Storage', 'Priority Support', 'API Access', 'Custom Domains'],
                    'subscribers_count' => 567,
                ],
                [
                    'id' => 3,
                    'name' => 'Enterprise',
                    'price' => 99.99,
                    'billing_cycle' => 'monthly',
                    'features' => ['Unlimited Projects', '100GB Storage', '24/7 Support', 'API Access', 'Custom Domains', 'SSO', 'Dedicated Account Manager'],
                    'subscribers_count' => 89,
                ],
                [
                    'id' => 4,
                    'name' => 'Pro Annual',
                    'price' => 299.99,
                    'billing_cycle' => 'yearly',
                    'features' => ['Unlimited Projects', '10GB Storage', 'Priority Support', 'API Access', 'Custom Domains', '2 Months Free'],
                    'subscribers_count' => 123,
                ],
            ],
        ]);
    }

    public function plugins(Request $request): Response
    {
        return Inertia::render('Admin/Plugins', [
            'user' => $request->user()->only('id', 'name', 'email', 'avatar', 'role'),
            'plugins' => [
                ['id' => 1, 'name' => 'Analytics Dashboard', 'description' => 'Advanced analytics and reporting for your projects', 'icon' => 'chart-bar', 'is_active' => true],
                ['id' => 2, 'name' => 'SEO Tools', 'description' => 'Optimize your projects for search engines', 'icon' => 'search', 'is_active' => true],
                ['id' => 3, 'name' => 'Social Media Integration', 'description' => 'Connect and share to social platforms', 'icon' => 'share', 'is_active' => false],
                ['id' => 4, 'name' => 'Email Marketing', 'description' => 'Built-in email campaign management', 'icon' => 'mail', 'is_active' => true],
                ['id' => 5, 'name' => 'A/B Testing', 'description' => 'Test different versions of your pages', 'icon' => 'beaker', 'is_active' => false],
                ['id' => 6, 'name' => 'Payment Gateway', 'description' => 'Accept payments directly on your site', 'icon' => 'credit-card', 'is_active' => true],
            ],
        ]);
    }

    public function languages(Request $request): Response
    {
        return Inertia::render('Admin/Languages', [
            'user' => $request->user()->only('id', 'name', 'email', 'avatar', 'role'),
            'languages' => [
                ['id' => 1, 'name' => 'English', 'code' => 'en', 'flag' => '🇺🇸', 'is_active' => true],
                ['id' => 2, 'name' => 'Spanish', 'code' => 'es', 'flag' => '🇪🇸', 'is_active' => true],
                ['id' => 3, 'name' => 'French', 'code' => 'fr', 'flag' => '🇫🇷', 'is_active' => true],
                ['id' => 4, 'name' => 'German', 'code' => 'de', 'flag' => '🇩🇪', 'is_active' => false],
                ['id' => 5, 'name' => 'Japanese', 'code' => 'ja', 'flag' => '🇯🇵', 'is_active' => false],
                ['id' => 6, 'name' => 'Portuguese', 'code' => 'pt', 'flag' => '🇧🇷', 'is_active' => true],
            ],
        ]);
    }

    public function cronjobs(Request $request): Response
    {
        return Inertia::render('Admin/Cronjobs', [
            'user' => $request->user()->only('id', 'name', 'email', 'avatar', 'role'),
            'cronjobs' => [
                ['id' => 1, 'name' => 'Daily Backup', 'schedule' => '0 0 * * *', 'last_run' => '2024-01-15 00:00:00', 'next_run' => '2024-01-16 00:00:00', 'is_active' => true],
                ['id' => 2, 'name' => 'Email Queue Processor', 'schedule' => '*/5 * * * *', 'last_run' => '2024-01-15 14:25:00', 'next_run' => '2024-01-15 14:30:00', 'is_active' => true],
                ['id' => 3, 'name' => 'Cache Cleanup', 'schedule' => '0 */6 * * *', 'last_run' => '2024-01-15 12:00:00', 'next_run' => '2024-01-15 18:00:00', 'is_active' => true],
                ['id' => 4, 'name' => 'Report Generator', 'schedule' => '0 8 * * 1', 'last_run' => '2024-01-08 08:00:00', 'next_run' => '2024-01-22 08:00:00', 'is_active' => false],
                ['id' => 5, 'name' => 'Subscription Renewal Check', 'schedule' => '0 1 * * *', 'last_run' => '2024-01-15 01:00:00', 'next_run' => '2024-01-16 01:00:00', 'is_active' => true],
                ['id' => 6, 'name' => 'Analytics Aggregation', 'schedule' => '0 2 * * *', 'last_run' => '2024-01-15 02:00:00', 'next_run' => '2024-01-16 02:00:00', 'is_active' => true],
            ],
        ]);
    }

    public function settings(Request $request): Response
    {
        return Inertia::render('Admin/Settings', [
            'user' => $request->user()->only('id', 'name', 'email', 'avatar', 'role'),
            'settings' => [
                'general' => [
                    'site_name' => config('app.name'),
                    'site_url' => config('app.url'),
                    'timezone' => 'UTC',
                    'date_format' => 'Y-m-d',
                ],
                'email' => [
                    'smtp_host' => 'smtp.mailtrap.io',
                    'smtp_port' => '2525',
                    'smtp_username' => 'username',
                    'from_email' => 'noreply@'.parse_url(config('app.url'), PHP_URL_HOST),
                    'from_name' => config('app.name'),
                ],
                'security' => [
                    'two_factor_enabled' => true,
                    'session_timeout' => 60,
                    'password_min_length' => 8,
                ],
                'billing' => [
                    'currency' => 'USD',
                    'stripe_enabled' => true,
                    'paypal_enabled' => false,
                ],
            ],
        ]);
    }
}
