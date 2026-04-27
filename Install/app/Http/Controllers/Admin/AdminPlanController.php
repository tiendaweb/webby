<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ChecksDemoMode;
use App\Models\AiProvider;
use App\Models\Builder;
use App\Models\Plan;
use App\Services\AdminStatsService;
use App\Services\DomainSettingService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdminPlanController extends Controller
{
    use ChecksDemoMode;

    /**
     * Display a listing of plans.
     */
    public function index(Request $request)
    {
        $query = Plan::with(['aiProvider', 'builder'])
            ->withCount(['subscriptions as active_subscribers_count' => function ($query) {
                $query->where('status', 'active');
            }])->orderBy('sort_order');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        $plans = $query->get()->map(function ($plan) {
            $plan->ai_provider_description = $plan->ai_provider_description;
            $plan->builder_description = $plan->builder_description;

            return $plan;
        });

        // Get stats
        $stats = [
            'total_plans' => Plan::count(),
            'active_plans' => Plan::where('is_active', true)->count(),
            'total_subscribers' => \App\Models\Subscription::active()->count(),
        ];

        return Inertia::render('Admin/Plans/Index', [
            'plans' => $plans,
            'stats' => $stats,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Show the form for creating a new plan.
     */
    public function create()
    {
        $aiProviders = AiProvider::active()
            ->orderBy('is_default', 'desc')
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'is_default']);

        $builders = Builder::active()
            ->orderBy('name')
            ->get(['id', 'name']);

        $domainSettings = app(DomainSettingService::class);

        return Inertia::render('Admin/Plans/Create', [
            'aiProviders' => $aiProviders,
            'builders' => $builders,
            'domainSettings' => [
                'subdomainsEnabled' => $domainSettings->isSubdomainsEnabled(),
                'customDomainsEnabled' => $domainSettings->isCustomDomainsEnabled(),
            ],
        ]);
    }

    /**
     * Show the form for editing the specified plan.
     */
    public function edit(Plan $plan)
    {
        $plan->load(['aiProvider', 'builder']);

        $aiProviders = AiProvider::active()
            ->orderBy('is_default', 'desc')
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'is_default']);

        $builders = Builder::active()
            ->orderBy('name')
            ->get(['id', 'name']);

        $domainSettings = app(DomainSettingService::class);

        return Inertia::render('Admin/Plans/Edit', [
            'plan' => $plan,
            'aiProviders' => $aiProviders,
            'builders' => $builders,
            'domainSettings' => [
                'subdomainsEnabled' => $domainSettings->isSubdomainsEnabled(),
                'customDomainsEnabled' => $domainSettings->isCustomDomainsEnabled(),
            ],
        ]);
    }

    /**
     * Store a newly created plan.
     */
    public function store(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'price' => 'required|numeric|min:0',
            'billing_period' => 'required|in:monthly,yearly,lifetime',
            'features' => 'nullable|array',
            'features.*.name' => 'required|string|max:255',
            'features.*.included' => 'required|boolean',
            'is_active' => 'boolean',
            'is_popular' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
            'ai_provider_id' => 'nullable|exists:ai_providers,id',
            'fallback_ai_provider_ids' => 'nullable|array',
            'fallback_ai_provider_ids.*' => 'exists:ai_providers,id',
            'builder_id' => 'nullable|exists:builders,id',
            'monthly_build_credits' => 'nullable|integer|min:-1',
            'allow_user_ai_api_key' => 'boolean',
            'max_projects' => 'nullable|integer|min:0',
            // Subdomain settings
            'enable_subdomains' => 'boolean',
            'max_subdomains_per_user' => 'nullable|integer|min:0',
            'allow_private_visibility' => 'boolean',
            // Custom domain settings
            'enable_custom_domains' => 'boolean',
            'max_custom_domains_per_user' => 'nullable|integer|min:0',
            // Firebase settings
            'enable_firebase' => 'boolean',
            'allow_user_firebase_config' => 'boolean',
            // File storage settings
            'enable_file_storage' => 'boolean',
            'max_storage_mb' => 'nullable|integer|min:0',
            'max_file_size_mb' => 'nullable|integer|min:1|max:500',
            'allowed_file_types' => 'nullable|array',
            'allowed_file_types.*' => 'string',
        ]);

        $plan = Plan::create([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
            'description' => $validated['description'] ?? null,
            'price' => $validated['price'],
            'billing_period' => $validated['billing_period'],
            'features' => $validated['features'] ?? [],
            'is_active' => $validated['is_active'] ?? true,
            'is_popular' => $validated['is_popular'] ?? false,
            'sort_order' => $validated['sort_order'] ?? 0,
            'ai_provider_id' => $validated['ai_provider_id'] ?? null,
            'fallback_ai_provider_ids' => $validated['fallback_ai_provider_ids'] ?? null,
            'builder_id' => $validated['builder_id'] ?? null,
            'monthly_build_credits' => $validated['monthly_build_credits'] ?? 0,
            'allow_user_ai_api_key' => $validated['allow_user_ai_api_key'] ?? false,
            'max_projects' => $validated['max_projects'] ?? null,
            // Subdomain settings
            'enable_subdomains' => $validated['enable_subdomains'] ?? false,
            'max_subdomains_per_user' => $validated['max_subdomains_per_user'] ?? null,
            'allow_private_visibility' => $validated['allow_private_visibility'] ?? false,
            // Custom domain settings
            'enable_custom_domains' => $validated['enable_custom_domains'] ?? false,
            'max_custom_domains_per_user' => $validated['max_custom_domains_per_user'] ?? null,
            // Firebase settings
            'enable_firebase' => $validated['enable_firebase'] ?? false,
            'allow_user_firebase_config' => $validated['allow_user_firebase_config'] ?? false,
            // File storage settings
            'enable_file_storage' => $validated['enable_file_storage'] ?? false,
            'max_storage_mb' => $validated['max_storage_mb'] ?? null,
            'max_file_size_mb' => $validated['max_file_size_mb'] ?? 10,
            'allowed_file_types' => $validated['allowed_file_types'] ?? null,
        ]);

        app(AdminStatsService::class)->clearCache();

        return redirect()->route('admin.plans')->with('success', 'Plan created successfully.');
    }

    /**
     * Update the specified plan.
     */
    public function update(Request $request, Plan $plan)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'price' => 'required|numeric|min:0',
            'billing_period' => 'required|in:monthly,yearly,lifetime',
            'features' => 'nullable|array',
            'features.*.name' => 'required|string|max:255',
            'features.*.included' => 'required|boolean',
            'is_active' => 'boolean',
            'is_popular' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
            'ai_provider_id' => 'nullable|exists:ai_providers,id',
            'fallback_ai_provider_ids' => 'nullable|array',
            'fallback_ai_provider_ids.*' => 'exists:ai_providers,id',
            'builder_id' => 'nullable|exists:builders,id',
            'monthly_build_credits' => 'nullable|integer|min:-1',
            'allow_user_ai_api_key' => 'boolean',
            'max_projects' => 'nullable|integer|min:0',
            // Subdomain settings
            'enable_subdomains' => 'boolean',
            'max_subdomains_per_user' => 'nullable|integer|min:0',
            'allow_private_visibility' => 'boolean',
            // Custom domain settings
            'enable_custom_domains' => 'boolean',
            'max_custom_domains_per_user' => 'nullable|integer|min:0',
            // Firebase settings
            'enable_firebase' => 'boolean',
            'allow_user_firebase_config' => 'boolean',
            // File storage settings
            'enable_file_storage' => 'boolean',
            'max_storage_mb' => 'nullable|integer|min:0',
            'max_file_size_mb' => 'nullable|integer|min:1|max:500',
            'allowed_file_types' => 'nullable|array',
            'allowed_file_types.*' => 'string',
        ]);

        $plan->update([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
            'description' => $validated['description'] ?? null,
            'price' => $validated['price'],
            'billing_period' => $validated['billing_period'],
            'features' => $validated['features'] ?? [],
            'is_active' => $validated['is_active'] ?? $plan->is_active,
            'is_popular' => $validated['is_popular'] ?? false,
            'sort_order' => $validated['sort_order'] ?? $plan->sort_order,
            'ai_provider_id' => $validated['ai_provider_id'] ?? null,
            'fallback_ai_provider_ids' => $validated['fallback_ai_provider_ids'] ?? null,
            'builder_id' => $validated['builder_id'] ?? null,
            'monthly_build_credits' => $validated['monthly_build_credits'] ?? $plan->monthly_build_credits,
            'allow_user_ai_api_key' => $validated['allow_user_ai_api_key'] ?? false,
            'max_projects' => $validated['max_projects'] ?? null,
            // Subdomain settings
            'enable_subdomains' => $validated['enable_subdomains'] ?? false,
            'max_subdomains_per_user' => $validated['max_subdomains_per_user'] ?? $plan->max_subdomains_per_user,
            'allow_private_visibility' => $validated['allow_private_visibility'] ?? false,
            // Custom domain settings
            'enable_custom_domains' => $validated['enable_custom_domains'] ?? false,
            'max_custom_domains_per_user' => $validated['max_custom_domains_per_user'] ?? $plan->max_custom_domains_per_user,
            // Firebase settings
            'enable_firebase' => $validated['enable_firebase'] ?? false,
            'allow_user_firebase_config' => $validated['allow_user_firebase_config'] ?? false,
            // File storage settings
            'enable_file_storage' => $validated['enable_file_storage'] ?? false,
            'max_storage_mb' => $validated['max_storage_mb'] ?? $plan->max_storage_mb,
            'max_file_size_mb' => $validated['max_file_size_mb'] ?? $plan->max_file_size_mb,
            'allowed_file_types' => $validated['allowed_file_types'] ?? $plan->allowed_file_types,
        ]);

        app(AdminStatsService::class)->clearCache();

        return redirect()->route('admin.plans')->with('success', 'Plan updated successfully.');
    }

    /**
     * Remove the specified plan.
     */
    public function destroy(Plan $plan)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        // Check if plan has active subscriptions
        $activeSubscriptions = $plan->subscriptions()->where('status', 'active')->count();

        if ($activeSubscriptions > 0) {
            return back()->withErrors([
                'plan' => "Cannot delete plan with {$activeSubscriptions} active subscription(s). Please migrate users to another plan first.",
            ]);
        }

        $plan->delete();

        app(AdminStatsService::class)->clearCache();

        return back()->with('success', 'Plan deleted successfully.');
    }

    /**
     * Toggle the active status of a plan.
     */
    public function toggleStatus(Plan $plan)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $plan->update([
            'is_active' => ! $plan->is_active,
        ]);

        app(AdminStatsService::class)->clearCache();

        $status = $plan->is_active ? 'activated' : 'deactivated';

        return back()->with('success', "Plan {$status} successfully.");
    }

    /**
     * Reorder plans.
     */
    public function reorder(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $request->validate([
            'plans' => 'required|array',
            'plans.*.id' => 'required|exists:plans,id',
            'plans.*.sort_order' => 'required|integer|min:0',
        ]);

        foreach ($request->plans as $planData) {
            Plan::where('id', $planData['id'])->update([
                'sort_order' => $planData['sort_order'],
            ]);
        }

        app(AdminStatsService::class)->clearCache();

        return response()->json(['success' => true]);
    }
}
