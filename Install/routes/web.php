<?php

use App\Http\Controllers\AccountDeletionController;
use App\Http\Controllers\Admin\AdminCronjobController;
use App\Http\Controllers\Admin\AdminLanguageController;
use App\Http\Controllers\Admin\AdminPlanController;
use App\Http\Controllers\Admin\AdminReferralController;
use App\Http\Controllers\Admin\AdminSubscriptionController;
use App\Http\Controllers\Admin\AdminTemplateController;
use App\Http\Controllers\Admin\AdminTransactionController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AiProviderController;
use App\Http\Controllers\Admin\BuilderController;
use App\Http\Controllers\Admin\ImpersonateController;
use App\Http\Controllers\Admin\PluginController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AppPreviewController;
use App\Http\Controllers\BuildCreditController;
use App\Http\Controllers\BuilderProxyController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\CookieConsentController;
use App\Http\Controllers\CreateController;
use App\Http\Controllers\DatabaseController;
use App\Http\Controllers\DataExportController;
use App\Http\Controllers\DocumentationController;
use App\Http\Controllers\FileManagerController;
use App\Http\Controllers\InstallController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PaymentGatewayController;
use App\Http\Controllers\PreviewController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectCustomDomainController;
use App\Http\Controllers\ProjectFileController;
use App\Http\Controllers\ProjectFirebaseController;
use App\Http\Controllers\ProjectPublishController;
use App\Http\Controllers\ProjectSettingsController;
use App\Http\Controllers\ReferralController;
use App\Http\Controllers\ReferralTrackingController;
use App\Http\Controllers\UpgradeController;
use App\Models\Project;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\BroadcastService;
use App\Services\BuildCreditService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Installation Routes (Before any DB-dependent routes)
|--------------------------------------------------------------------------
*/
Route::prefix('install')->middleware('not-installed')->group(function () {
    Route::get('/', [InstallController::class, 'welcome'])->name('install');

    Route::middleware(\App\Http\Middleware\InstallationGuard::class)->group(function () {
        Route::get('requirements', [InstallController::class, 'requirements'])->name('install.requirements');
        Route::get('permissions', [InstallController::class, 'permissions'])->name('install.permissions');
        Route::get('database', [InstallController::class, 'database'])->name('install.database');
        Route::post('database', [InstallController::class, 'storeDatabase'])->name('install.database.store');
        Route::get('admin', [InstallController::class, 'admin'])->name('install.admin');
        Route::post('admin', [InstallController::class, 'storeAdmin'])->name('install.admin.store');
    });

    Route::get('completed', [InstallController::class, 'completed'])->name('install.completed');
});

/*
|--------------------------------------------------------------------------
| Upgrade Routes
|--------------------------------------------------------------------------
*/
Route::prefix('upgrade')->middleware('installed')->group(function () {
    Route::get('/', [UpgradeController::class, 'index'])->name('upgrade');
    Route::post('/', [UpgradeController::class, 'run'])->name('upgrade.run');
    Route::get('completed', [UpgradeController::class, 'completed'])->name('upgrade.completed');
});

/*
|--------------------------------------------------------------------------
| Documentation Route (Demo Mode Only)
|--------------------------------------------------------------------------
*/
if (config('app.env') === 'local' && config('app.demo')) {
    Route::get('documentation/{path?}', [DocumentationController::class, 'show'])
        ->where('path', '.*')
        ->name('documentation');
}

/*
|--------------------------------------------------------------------------
| Application Routes (require installation)
|--------------------------------------------------------------------------
*/
Route::middleware('installed')->group(function () {

    Route::get('/', function () {
        // Check if landing page is enabled
        if (! SystemSetting::get('landing_page_enabled', true)) {
            // If user is already authenticated, redirect to create page instead of login
            if (auth()->check()) {
                return redirect()->route('create');
            }

            return redirect()->route('login');
        }

        // Get landing page config from database
        $landingPageService = app(\App\Services\LandingPageService::class);
        $internalAiService = app(\App\Services\InternalAiService::class);
        $locale = app()->getLocale();
        $pageConfig = $landingPageService->getPageConfig($locale);

        // Get translated content from InternalAiService
        try {
            $allHeadlines = $internalAiService->getHeroHeadlines(4, $locale);
            $allSubtitles = $internalAiService->getHeroSubtitles(4, $locale);
            $fallbackSuggestions = $internalAiService->getSuggestions(4, $locale);
            $fallbackTypingPrompts = $internalAiService->getTypingPrompts(8, $locale);
        } catch (\Exception $e) {
            $allHeadlines = \App\Services\InternalAiService::STATIC_HERO_HEADLINES;
            $allSubtitles = \App\Services\InternalAiService::STATIC_HERO_SUBTITLES;
            $fallbackSuggestions = \App\Services\InternalAiService::getStaticSuggestions($locale);
            $fallbackTypingPrompts = \App\Services\InternalAiService::getStaticTypingPrompts($locale);
        }

        // Pick ONE random headline and subtitle (like /create does with greetings)
        $randomHeadline = ! empty($allHeadlines)
            ? $allHeadlines[random_int(0, count($allHeadlines) - 1)]
            : \App\Services\InternalAiService::STATIC_HERO_HEADLINES[0];
        $randomSubtitle = ! empty($allSubtitles)
            ? $allSubtitles[random_int(0, count($allSubtitles) - 1)]
            : \App\Services\InternalAiService::STATIC_HERO_SUBTITLES[0];

        // Override hero section content with translated values from InternalAiService
        // This ensures proper translation when locale-specific DB content doesn't exist
        if (isset($pageConfig['sections'])) {
            foreach ($pageConfig['sections'] as &$section) {
                if ($section['type'] === 'hero') {
                    $section['content']['headlines'] = [$randomHeadline];
                    $section['content']['subtitles'] = [$randomSubtitle];
                    $section['content']['suggestions'] = $fallbackSuggestions;
                    $section['content']['typing_prompts'] = $fallbackTypingPrompts;
                    break;
                }
            }
            unset($section);
        }

        // Get active plans for pricing section
        $plans = \App\Models\Plan::active()
            ->orderBy('sort_order')
            ->get(['id', 'name', 'slug', 'description', 'price', 'billing_period',
                'features', 'is_popular', 'max_projects', 'monthly_build_credits',
                'allow_user_ai_api_key']);

        // For logged-in users, check project creation eligibility
        $canCreateProject = true;
        $cannotCreateReason = null;
        $isPusherConfigured = true;

        if (auth()->check()) {
            $broadcastService = app(BroadcastService::class);
            $isPusherConfigured = $broadcastService->isConfigured();

            $buildCreditService = app(BuildCreditService::class);
            $canBuildResult = $buildCreditService->canPerformBuild(auth()->user());
            $canCreateProject = $canBuildResult['allowed'];
            $cannotCreateReason = $canBuildResult['reason'];
        }

        return Inertia::render('Landing', array_merge($pageConfig, [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register') && SystemSetting::get('enable_registration', true),
            'plans' => $plans,
            'isPusherConfigured' => $isPusherConfigured,
            'canCreateProject' => $canCreateProject,
            'cannotCreateReason' => $cannotCreateReason,
            'statistics' => Cache::remember('landing_stats', 3600, fn () => [
                'usersCount' => User::count(),
                'projectsCount' => Project::count(),
            ]),
            // Legacy props for fallback (used when database content is empty)
            'headline' => $allHeadlines[0] ?? null,
            'subtitle' => $allSubtitles[0] ?? null,
            'suggestions' => $fallbackSuggestions,
            'typingPrompts' => $fallbackTypingPrompts,
        ]));
    })->name('welcome');

    Route::get('/landing/ai-content', [CreateController::class, 'landingAiContent'])
        ->name('landing.ai-content');

    // Legal pages
    Route::get('/privacy', function () {
        return Inertia::render('Legal/Privacy', [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register') && SystemSetting::get('enable_registration', true),
        ]);
    })->name('privacy');

    Route::get('/terms', function () {
        return Inertia::render('Legal/Terms', [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register') && SystemSetting::get('enable_registration', true),
        ]);
    })->name('terms');

    Route::get('/cookies', function () {
        return Inertia::render('Legal/Cookies', [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register') && SystemSetting::get('enable_registration', true),
        ]);
    })->name('cookies');

    Route::get('/create', [CreateController::class, 'index'])
        ->middleware(['auth', 'verified'])
        ->name('create');

    Route::get('/create/ai-content', [CreateController::class, 'aiContent'])
        ->middleware(['auth', 'verified'])
        ->name('create.ai-content');

    // Project chat routes
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/project/{project}', [ChatController::class, 'show'])->name('chat');
        Route::post('/project/send', [ChatController::class, 'send'])->name('chat.send');
        Route::get('/project/{project}/suggestions', [ChatController::class, 'suggestions'])->name('chat.suggestions');
    });

    // Project Settings
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/project/{project}/settings', [ProjectSettingsController::class, 'show'])->name('project.settings');
        Route::put('/project/{project}/settings/general', [ProjectSettingsController::class, 'updateGeneral']);
        Route::put('/project/{project}/settings/knowledge', [ProjectSettingsController::class, 'updateKnowledge']);
        Route::put('/project/{project}/theme', [ProjectSettingsController::class, 'updateTheme'])->name('project.theme.update');
        Route::post('/project/{project}/settings/share-image', [ProjectSettingsController::class, 'uploadShareImage']);
        Route::delete('/project/{project}/settings/share-image', [ProjectSettingsController::class, 'deleteShareImage']);
        Route::post('/project/{project}/thumbnail', [ProjectSettingsController::class, 'uploadThumbnail']);
        // API Token management
        Route::post('/project/{project}/api-token', [ProjectSettingsController::class, 'generateApiToken']);
        Route::post('/project/{project}/api-token/regenerate', [ProjectSettingsController::class, 'regenerateApiToken']);
        Route::delete('/project/{project}/api-token', [ProjectSettingsController::class, 'revokeApiToken']);
    });

    // Publishing
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::post('/api/subdomain/check-availability', [ProjectPublishController::class, 'checkAvailability']);
        Route::post('/project/{project}/publish', [ProjectPublishController::class, 'publish']);
        Route::post('/project/{project}/unpublish', [ProjectPublishController::class, 'unpublish']);
    });

    // Custom Domain routes
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::post('/api/domain/check-availability', [ProjectCustomDomainController::class, 'checkAvailability']);
        Route::post('/project/{project}/domain', [ProjectCustomDomainController::class, 'store'])->name('project.domain.store');
        Route::post('/project/{project}/domain/verify', [ProjectCustomDomainController::class, 'verify'])->name('project.domain.verify');
        Route::get('/project/{project}/domain/instructions', [ProjectCustomDomainController::class, 'instructions'])->name('project.domain.instructions');
        Route::delete('/project/{project}/domain', [ProjectCustomDomainController::class, 'destroy'])->name('project.domain.destroy');
    });

    // Projects routes
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/projects', [ProjectController::class, 'index'])->name('projects.index');
        Route::post('/projects', [ProjectController::class, 'store'])->name('projects.store');
        Route::get('/projects/trash', [ProjectController::class, 'trash'])->name('projects.trash');
        Route::post('/projects/{project}/toggle-star', [ProjectController::class, 'toggleStar'])->name('projects.toggle-star');
        Route::post('/projects/{project}/duplicate', [ProjectController::class, 'duplicate'])->name('projects.duplicate');
        Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->name('projects.destroy');
        Route::post('/projects/{project}/restore', [ProjectController::class, 'restore'])->withTrashed()->name('projects.restore');
        Route::delete('/projects/{project}/force-delete', [ProjectController::class, 'forceDelete'])->withTrashed()->name('projects.force-delete');
    });

    // File Manager routes
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/file-manager', [FileManagerController::class, 'index'])->name('file-manager.index');
    });

    // Database (Firebase) routes
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/database', [DatabaseController::class, 'index'])->name('database.index');
        Route::get('/firebase/collections', [\App\Http\Controllers\FirebaseCollectionController::class, 'index'])->name('firebase.collections');
    });

    // Project Files routes
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/project/{project}/files', [ProjectFileController::class, 'index'])->name('project.files.index');
        Route::post('/project/{project}/files', [ProjectFileController::class, 'store'])->name('project.files.store');
        Route::get('/project/{project}/files/{file}', [ProjectFileController::class, 'show'])->name('project.file.serve');
        Route::delete('/project/{project}/files/{file}', [ProjectFileController::class, 'destroy'])->name('project.files.destroy');
        Route::get('/project/{project}/files-usage', [ProjectFileController::class, 'usage'])->name('project.files.usage');
    });

    // Project Firebase routes
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/project/{project}/firebase/config', [ProjectFirebaseController::class, 'getConfig'])->name('project.firebase.config');
        Route::put('/project/{project}/firebase/config', [ProjectFirebaseController::class, 'updateConfig'])->name('project.firebase.config.update');
        Route::delete('/project/{project}/firebase/config', [ProjectFirebaseController::class, 'resetConfig'])->name('project.firebase.config.reset');
        Route::get('/project/{project}/firebase/rules', [ProjectFirebaseController::class, 'generateRules'])->name('project.firebase.rules');
        Route::post('/project/{project}/firebase/test', [ProjectFirebaseController::class, 'testConnection'])->name('project.firebase.test');

        // Project Firebase Admin SDK routes
        Route::get('/project/{project}/firebase/admin-sdk', [ProjectFirebaseController::class, 'getAdminSdkStatus'])->name('project.firebase.admin-sdk.status');
        Route::post('/project/{project}/firebase/admin-sdk', [ProjectFirebaseController::class, 'uploadAdminSdk'])->name('project.firebase.admin-sdk.upload');
        Route::post('/project/{project}/firebase/admin-sdk/test', [ProjectFirebaseController::class, 'testAdminSdk'])->name('project.firebase.admin-sdk.test');
        Route::delete('/project/{project}/firebase/admin-sdk', [ProjectFirebaseController::class, 'deleteAdminSdk'])->name('project.firebase.admin-sdk.delete');
    });

    Route::middleware('auth')->group(function () {
        Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
        Route::post('/profile/consents', [ProfileController::class, 'updateConsents'])->name('profile.consents');
        Route::put('/profile/ai-settings', [ProfileController::class, 'updateAiSettings'])->name('profile.ai-settings.update');
        Route::post('/profile/ai-settings/test', [ProfileController::class, 'testAiKey'])->name('profile.ai-settings.test');
        Route::post('/profile/ai-settings/remove-key', [ProfileController::class, 'removeAiKey'])->name('profile.ai-settings.remove-key');
        Route::put('/profile/sound-settings', [ProfileController::class, 'updateSoundSettings'])->name('profile.sound-settings.update');
        Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

        // Cookie Consent
        Route::post('/cookie-consent', [CookieConsentController::class, 'store'])->name('cookie-consent.store');

        // Data Export (GDPR)
        Route::post('/user/data-export', [DataExportController::class, 'request'])->name('data-export.request');
        Route::get('/data-export/download/{token}', [DataExportController::class, 'download'])->name('data-export.download');

        // Account Deletion (GDPR)
        Route::post('/account/request-deletion', [AccountDeletionController::class, 'request'])->name('account.request-deletion');

        // Impersonation
        Route::post('/impersonate/stop', [ImpersonateController::class, 'stop'])->name('impersonate.stop');
    });

    // Public route for cancelling account deletion (via email link)
    Route::get('/account/cancel-deletion/{token}', [AccountDeletionController::class, 'cancel'])->name('account.cancel-deletion');

    // Locale change (works for guests and authenticated users)
    Route::post('/locale', [LocaleController::class, 'update'])->name('locale.update');

    // User Billing Routes
    Route::middleware(['auth', 'verified'])->prefix('billing')->group(function () {
        Route::get('/', [\App\Http\Controllers\BillingController::class, 'index'])->name('billing.index');
        Route::get('/plans', [\App\Http\Controllers\BillingController::class, 'plans'])->name('billing.plans');
        Route::get('/invoice/{transaction}', [\App\Http\Controllers\BillingController::class, 'downloadInvoice'])->name('billing.invoice');
        Route::post('/cancel', [\App\Http\Controllers\BillingController::class, 'cancelSubscription'])->name('billing.cancel');
        Route::get('/referral', [ReferralController::class, 'index'])->name('billing.referral');
        Route::get('/usage', [BuildCreditController::class, 'index'])->name('billing.usage');
        Route::get('/usage/stats', [BuildCreditController::class, 'stats'])->name('billing.usage.stats');
    });

    // Admin Routes
    Route::middleware(['auth', 'verified', 'admin'])->prefix('admin')->group(function () {
        Route::get('overview', [AdminController::class, 'overview'])->name('admin.overview');
        Route::post('refresh-stats', [AdminController::class, 'refreshStats'])->name('admin.refresh-stats');

        // User Management
        Route::get('users', [AdminUserController::class, 'index'])->name('admin.users');
        Route::get('users/search', [AdminUserController::class, 'search'])->name('admin.users.search');
        Route::post('users', [AdminUserController::class, 'store'])->name('admin.users.store');
        Route::put('users/{user}', [AdminUserController::class, 'update'])->name('admin.users.update');
        Route::delete('users/{user}', [AdminUserController::class, 'destroy'])->name('admin.users.destroy');
        Route::post('users/{user}/impersonate', [ImpersonateController::class, 'start'])->name('admin.users.impersonate');

        // Subscriptions
        Route::get('subscriptions', [AdminSubscriptionController::class, 'index'])->name('admin.subscriptions');
        Route::post('subscriptions', [AdminSubscriptionController::class, 'store'])->name('admin.subscriptions.store');
        Route::get('subscriptions/{subscription}', [AdminSubscriptionController::class, 'show'])->name('admin.subscriptions.show');
        Route::post('subscriptions/{subscription}/cancel', [AdminSubscriptionController::class, 'cancel'])->name('admin.subscriptions.cancel');
        Route::post('subscriptions/{subscription}/extend', [AdminSubscriptionController::class, 'extend'])->name('admin.subscriptions.extend');
        Route::post('subscriptions/{subscription}/approve', [AdminSubscriptionController::class, 'approve'])->name('admin.subscriptions.approve');

        // Transactions
        Route::get('transactions', [AdminTransactionController::class, 'index'])->name('admin.transactions');
        Route::get('transactions/{transaction}', [AdminTransactionController::class, 'show'])->name('admin.transactions.show');
        Route::post('transactions/{transaction}/approve', [AdminTransactionController::class, 'approve'])->name('admin.transactions.approve');
        Route::post('transactions/{transaction}/reject', [AdminTransactionController::class, 'reject'])->name('admin.transactions.reject');
        Route::post('transactions/{transaction}/refund', [AdminTransactionController::class, 'refund'])->name('admin.transactions.refund');
        Route::post('transactions/adjustment', [AdminTransactionController::class, 'adjustment'])->name('admin.transactions.adjustment');

        // Referrals
        Route::get('referrals', [AdminReferralController::class, 'index'])->name('admin.referrals');

        // Plans
        Route::get('plans', [AdminPlanController::class, 'index'])->name('admin.plans');
        Route::get('plans/create', [AdminPlanController::class, 'create'])->name('admin.plans.create');
        Route::post('plans', [AdminPlanController::class, 'store'])->name('admin.plans.store');
        Route::get('plans/{plan}/edit', [AdminPlanController::class, 'edit'])->name('admin.plans.edit');
        Route::put('plans/{plan}', [AdminPlanController::class, 'update'])->name('admin.plans.update');
        Route::delete('plans/{plan}', [AdminPlanController::class, 'destroy'])->name('admin.plans.destroy');
        Route::post('plans/{plan}/toggle-status', [AdminPlanController::class, 'toggleStatus'])->name('admin.plans.toggle-status');
        Route::post('plans/reorder', [AdminPlanController::class, 'reorder'])->name('admin.plans.reorder');

        // Plugins
        Route::get('plugins', [PluginController::class, 'index'])->name('admin.plugins');
        Route::post('plugins/upload', [PluginController::class, 'upload'])->name('admin.plugins.upload');
        Route::post('plugins/{slug}/install', [PluginController::class, 'install'])->name('admin.plugins.install');
        Route::post('plugins/{slug}/configure', [PluginController::class, 'configure'])->name('admin.plugins.configure');
        Route::post('plugins/{slug}/toggle', [PluginController::class, 'toggle'])->name('admin.plugins.toggle');
        Route::delete('plugins/{slug}', [PluginController::class, 'uninstall'])->name('admin.plugins.uninstall');
        Route::get('plugins/{slug}/config-schema', [PluginController::class, 'getConfigSchema'])->name('admin.plugins.config-schema');

        // Languages
        Route::get('languages', [AdminLanguageController::class, 'index'])->name('admin.languages');
        Route::post('languages', [AdminLanguageController::class, 'store'])->name('admin.languages.store');
        Route::put('languages/{language}', [AdminLanguageController::class, 'update'])->name('admin.languages.update');
        Route::delete('languages/{language}', [AdminLanguageController::class, 'destroy'])->name('admin.languages.destroy');
        Route::post('languages/{language}/toggle-status', [AdminLanguageController::class, 'toggleStatus'])->name('admin.languages.toggle-status');
        Route::post('languages/{language}/set-default', [AdminLanguageController::class, 'setDefault'])->name('admin.languages.set-default');
        Route::post('languages/reorder', [AdminLanguageController::class, 'reorder'])->name('admin.languages.reorder');

        // Cronjobs
        Route::get('cronjobs', [AdminCronjobController::class, 'index'])->name('admin.cronjobs');
        Route::get('cronjobs/logs', [AdminCronjobController::class, 'logs'])->name('admin.cronjobs.logs');
        Route::post('cronjobs/trigger', [AdminCronjobController::class, 'trigger'])->name('admin.cronjobs.trigger');

        // Settings
        Route::get('settings', [SettingsController::class, 'index'])->name('admin.settings');
        Route::put('settings/general', [SettingsController::class, 'updateGeneral'])->name('admin.settings.general');
        Route::post('settings/branding', [SettingsController::class, 'uploadBranding'])->name('admin.settings.branding');
        Route::delete('settings/branding', [SettingsController::class, 'deleteBranding'])->name('admin.settings.branding.delete');
        Route::put('settings/plans', [SettingsController::class, 'updatePlans'])->name('admin.settings.plans');
        Route::put('settings/auth', [SettingsController::class, 'updateAuth'])->name('admin.settings.auth');
        Route::put('settings/email', [SettingsController::class, 'updateEmail'])->name('admin.settings.email');
        Route::post('settings/email/test', [SettingsController::class, 'testEmail'])->name('admin.settings.email.test');
        Route::put('settings/gdpr', [SettingsController::class, 'updateGdpr'])->name('admin.settings.gdpr');
        Route::put('settings/integrations', [SettingsController::class, 'updateIntegrations'])->name('admin.settings.integrations');
        Route::post('settings/broadcast/test', [SettingsController::class, 'testBroadcast'])->name('admin.settings.broadcast.test');
        Route::post('settings/firebase/test', [SettingsController::class, 'testFirebase'])->name('admin.settings.firebase.test');
        Route::put('settings/referral', [SettingsController::class, 'updateReferral'])->name('admin.settings.referral');
        Route::put('settings/domains', [SettingsController::class, 'updateDomains'])->name('admin.settings.domains');
        Route::get('settings/currency-compatibility/{currency}', [SettingsController::class, 'checkCurrencyCompatibility'])->name('admin.settings.currency-compatibility');

        // Firebase Admin SDK
        Route::post('settings/firebase-admin', [SettingsController::class, 'uploadFirebaseAdmin'])->name('admin.settings.firebase-admin.upload');
        Route::post('settings/firebase-admin/test', [SettingsController::class, 'testFirebaseAdmin'])->name('admin.settings.firebase-admin.test');
        Route::delete('settings/firebase-admin', [SettingsController::class, 'deleteFirebaseAdmin'])->name('admin.settings.firebase-admin.delete');

        // Builder Management
        Route::get('ai-builders', [BuilderController::class, 'index'])->name('admin.ai-builders');
        Route::post('ai-builders', [BuilderController::class, 'store'])->name('admin.ai-builders.store');
        Route::put('ai-builders/{builder}', [BuilderController::class, 'update'])->name('admin.ai-builders.update');
        Route::delete('ai-builders/{builder}', [BuilderController::class, 'destroy'])->name('admin.ai-builders.destroy');
        Route::get('ai-builders/{builder}/details', [BuilderController::class, 'getDetails'])->name('admin.ai-builders.details');
        Route::post('ai-builders/generate-key', [BuilderController::class, 'generateKey'])->name('admin.ai-builders.generate-key');

        // AI Providers
        Route::get('ai-providers', [AiProviderController::class, 'index'])->name('admin.ai-providers');
        Route::post('ai-providers', [AiProviderController::class, 'store'])->name('admin.ai-providers.store');
        Route::put('ai-providers/{aiProvider}', [AiProviderController::class, 'update'])->name('admin.ai-providers.update');
        Route::delete('ai-providers/{aiProvider}', [AiProviderController::class, 'destroy'])->name('admin.ai-providers.destroy');
        Route::post('ai-providers/{aiProvider}/test', [AiProviderController::class, 'testConnection'])->name('admin.ai-providers.test');

        // Templates
        Route::get('ai-templates', [AdminTemplateController::class, 'index'])->name('admin.ai-templates');
        Route::post('ai-templates', [AdminTemplateController::class, 'store'])->name('admin.ai-templates.store');
        Route::put('ai-templates/{template}', [AdminTemplateController::class, 'update'])->name('admin.ai-templates.update');
        Route::delete('ai-templates/{template}', [AdminTemplateController::class, 'destroy'])->name('admin.ai-templates.destroy');
        Route::get('ai-templates/{template}/metadata', [AdminTemplateController::class, 'metadata'])->name('admin.ai-templates.metadata');

        // Landing Builder
        Route::get('landing-builder', [\App\Http\Controllers\Admin\LandingBuilderController::class, 'index'])->name('admin.landing-builder.index');
        Route::get('landing-builder/preview', [\App\Http\Controllers\Admin\LandingBuilderController::class, 'preview'])->name('admin.landing-builder.preview');
        Route::post('landing-builder/reorder', [\App\Http\Controllers\Admin\LandingBuilderController::class, 'reorder'])->name('admin.landing-builder.reorder');
        Route::put('landing-builder/sections/{section}', [\App\Http\Controllers\Admin\LandingBuilderController::class, 'updateSection'])->name('admin.landing-builder.section.update');
        Route::put('landing-builder/sections/{section}/content', [\App\Http\Controllers\Admin\LandingBuilderController::class, 'updateContent'])->name('admin.landing-builder.section.content');
        Route::put('landing-builder/sections/{section}/items', [\App\Http\Controllers\Admin\LandingBuilderController::class, 'updateItems'])->name('admin.landing-builder.section.items');
        Route::post('landing-builder/media', [\App\Http\Controllers\Admin\LandingBuilderController::class, 'uploadMedia'])->name('admin.landing-builder.media.upload');
        Route::delete('landing-builder/media', [\App\Http\Controllers\Admin\LandingBuilderController::class, 'deleteMedia'])->name('admin.landing-builder.media.delete');
    });

    // Payment Gateway Routes (webhooks don't require auth)
    Route::post('payment-gateways/{plugin}/webhook', [PaymentGatewayController::class, 'webhook'])->name('payment.webhook');
    Route::get('payment-gateways/callback', [PaymentGatewayController::class, 'callback'])->name('payment.callback');

    // Authenticated payment routes
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::post('payment/initiate', [PaymentGatewayController::class, 'initiatePayment'])->name('payment.initiate');
        Route::get('payment/gateways', [PaymentGatewayController::class, 'getAvailableGateways'])->name('payment.gateways');
    });

    // Builder Proxy Routes
    Route::middleware(['auth', 'verified'])->prefix('builder')->group(function () {
        Route::get('available', [BuilderProxyController::class, 'getAvailableBuilders'])->name('builder.available');

        // Project-specific builder routes
        Route::post('projects/{project}/start', [BuilderProxyController::class, 'startBuild'])->name('builder.start');
        Route::get('projects/{project}/status', [BuilderProxyController::class, 'getStatus'])->name('builder.status');
        Route::post('projects/{project}/chat', [BuilderProxyController::class, 'chat'])->name('builder.chat');
        Route::post('projects/{project}/cancel', [BuilderProxyController::class, 'cancel'])->name('builder.cancel');
        Route::post('projects/{project}/complete', [BuilderProxyController::class, 'completeBuild'])->name('builder.complete');
        Route::post('projects/{project}/download', [BuilderProxyController::class, 'downloadOutput'])->name('builder.download');
        Route::get('projects/{project}/files', [BuilderProxyController::class, 'getFiles'])->name('builder.files');
        Route::get('projects/{project}/file', [BuilderProxyController::class, 'getFile'])->name('builder.file');
        Route::put('projects/{project}/file', [BuilderProxyController::class, 'updateFile'])->name('builder.file.update');
        Route::post('projects/{project}/build', [BuilderProxyController::class, 'triggerBuild'])->name('builder.build');
        Route::get('projects/{project}/build', fn (Project $project) => redirect()->route('chat', $project));
        Route::get('projects/{project}/suggestions', [BuilderProxyController::class, 'getSuggestions'])->name('builder.suggestions');
        Route::get('projects/{project}/health', [BuilderProxyController::class, 'checkBuilderHealth'])->name('builder.health');
    });

    // Preview Routes - serve built project previews (with inspector injection)
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('/preview/{project}/exists', [PreviewController::class, 'exists'])->name('preview.exists');
        Route::get('/preview/{project}/{path?}', [PreviewController::class, 'serve'])
            ->where('path', '.*')
            ->name('preview.serve');
    });

    // App Preview Routes - serve clean preview files (no inspector)
    // Access controlled by project visibility settings
    Route::get('/app/{project}/{path?}', [AppPreviewController::class, 'serve'])
        ->where('path', '.*')
        ->name('app.serve');

    // Referral Tracking (Public)
    Route::get('/r/{codeOrSlug}', [ReferralTrackingController::class, 'track'])->name('referral.track');

    // Referral Actions (Authenticated)
    Route::middleware(['auth', 'verified'])->prefix('referral')->group(function () {
        Route::post('/generate-code', [ReferralController::class, 'generateCode'])->name('referral.generate-code');
        Route::put('/update-slug', [ReferralController::class, 'updateSlug'])->name('referral.update-slug');
        Route::get('/share-data', [ReferralController::class, 'getShareData'])->name('referral.share-data');
    });

    // User Notifications (Authenticated)
    Route::middleware(['auth', 'verified'])->prefix('api')->group(function () {
        Route::get('/notifications', [NotificationController::class, 'index'])
            ->name('api.notifications.index');
        Route::post('/notifications/{notification}/read', [NotificationController::class, 'markAsRead'])
            ->name('api.notifications.read');
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead'])
            ->name('api.notifications.read-all');
    });

    // Auth routes (also require installation)
    require __DIR__.'/auth.php';

    // Fallback: ensures the web middleware group (including domain middlewares)
    // runs for ALL unmatched request paths. Without this, paths like /style.css
    // on a project subdomain would 404 before the middleware can intercept them.
    // Using Route::fallback() instead of Route::any('{path?}') so it doesn't
    // shadow API routes, broadcasting/auth, or other framework-registered routes.
    Route::fallback(function () {
        abort(404);
    });

}); // End of 'installed' middleware group
