<?php

namespace App\Http\Controllers;

use App\Services\BuildCreditService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BuildCreditController extends Controller
{
    public function __construct(
        protected BuildCreditService $creditService
    ) {}

    /**
     * Display build credits page with stats and history.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $plan = $user->getCurrentPlan();
        $perPage = $request->input('per_page', 10);
        $period = $request->input('period', 'current_month');
        $usedOwnApiKey = $request->boolean('used_own_api_key');

        $history = $this->creditService->getUsageHistory($user, $perPage, $period, $usedOwnApiKey);

        // Transform history data to include project names
        $historyData = $history->through(function ($item) {
            return [
                'id' => $item->id,
                'project_id' => $item->project_id,
                'project_name' => $item->project?->name,
                'model' => $item->model,
                'prompt_tokens' => $item->prompt_tokens,
                'completion_tokens' => $item->completion_tokens,
                'total_tokens' => $item->total_tokens,
                'estimated_cost' => (float) $item->estimated_cost,
                'action' => $item->action,
                'used_own_api_key' => $item->used_own_api_key,
                'created_at' => $item->created_at->toISOString(),
            ];
        });

        return Inertia::render('Billing/Usage', [
            'stats' => $this->formatStatsForUI($user),
            'plan' => $plan ? [
                'name' => $plan->name,
                'monthly_build_credits' => $plan->getMonthlyBuildCredits(),
                'is_unlimited' => $plan->hasUnlimitedBuildCredits(),
                'allows_own_api_key' => $plan->allowsUserAiApiKey(),
            ] : null,
            'history' => $historyData,
            'period' => $period,
            'used_own_api_key' => $usedOwnApiKey,
        ]);
    }

    /**
     * API endpoint to get credit stats (for widgets/AJAX).
     */
    public function stats(Request $request)
    {
        $user = $request->user();

        return response()->json($this->formatStatsForUI($user));
    }

    /**
     * Format stats in the format expected by the UI components.
     */
    protected function formatStatsForUI($user, ?array $stats = null): array
    {
        if ($stats === null) {
            $stats = $this->creditService->getMonthlyStats($user);
        }

        // Calculate reset date (first of next month)
        $resetDate = now()->addMonth()->startOfMonth();

        return [
            'credits_remaining' => $stats['remaining_credits'],
            'credits_used' => $stats['used_tokens'],
            'monthly_limit' => $stats['monthly_allocation'],
            'is_unlimited' => $stats['is_unlimited'],
            'reset_date' => $resetDate->format('M j, Y'),
            'percentage_used' => $stats['usage_percentage'],
            'using_own_key' => $stats['using_own_key'],
        ];
    }
}
