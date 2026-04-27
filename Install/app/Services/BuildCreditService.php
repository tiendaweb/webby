<?php

namespace App\Services;

use App\Events\UserCreditsUpdatedEvent;
use App\Models\AiProvider;
use App\Models\BuildCreditUsage;
use App\Models\Project;
use App\Models\User;

class BuildCreditService
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Track AI usage and deduct credits.
     */
    public function trackUsage(
        User $user,
        int $promptTokens,
        int $completionTokens,
        string $model,
        ?AiProvider $provider = null,
        ?Project $project = null,
        string $action = 'build',
        bool $usedOwnApiKey = false
    ): BuildCreditUsage {
        $totalTokens = $promptTokens + $completionTokens;

        // Calculate estimated cost
        $estimatedCost = 0;
        if ($provider) {
            $estimatedCost = $provider->calculateCost($promptTokens, $completionTokens, $model);
        }

        // Create usage record
        $usage = BuildCreditUsage::create([
            'user_id' => $user->id,
            'project_id' => $project?->id,
            'ai_provider_id' => $provider?->id,
            'model' => $model,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'total_tokens' => $totalTokens,
            'estimated_cost' => $estimatedCost,
            'action' => $action,
            'used_own_api_key' => $usedOwnApiKey || $user->isUsingOwnAiApiKey(),
        ]);

        // Deduct credits from user (if not using own API key)
        if (! ($usedOwnApiKey || $user->isUsingOwnAiApiKey())) {
            $user->deductBuildCredits($totalTokens);
        }

        // Broadcast credit update to user
        $this->broadcastCreditsUpdated($user);

        // Check for low credits and notify if applicable
        $this->checkAndNotifyLowCredits($user);

        return $usage;
    }

    /**
     * Check if user has sufficient credits for an operation.
     */
    public function checkCredits(User $user, int $estimatedTokens = 0): bool
    {
        // Users with their own API key bypass credit checks
        if ($user->isUsingOwnAiApiKey()) {
            return true;
        }

        // Users with unlimited credits always pass
        if ($user->hasUnlimitedCredits()) {
            return true;
        }

        // If no estimate provided, just check if they have any credits
        if ($estimatedTokens === 0) {
            return $user->build_credits > 0;
        }

        return $user->hasBuildCredits($estimatedTokens);
    }

    /**
     * Get monthly usage stats for a user.
     */
    public function getMonthlyStats(User $user, ?bool $usedOwnApiKey = null): array
    {
        $stats = BuildCreditUsage::getMonthlyStatsForUser($user->id, $usedOwnApiKey);
        $plan = $user->getCurrentPlan();

        $monthlyAllocation = $plan?->getMonthlyBuildCredits() ?? 0;
        $isUnlimited = $plan?->hasUnlimitedBuildCredits() ?? false;

        return [
            'used_tokens' => $stats['total_tokens'],
            'prompt_tokens' => $stats['prompt_tokens'],
            'completion_tokens' => $stats['completion_tokens'],
            'estimated_cost' => $stats['total_cost'],
            'request_count' => $stats['request_count'],
            'remaining_credits' => $user->getRemainingBuildCredits(),
            'monthly_allocation' => $monthlyAllocation,
            'is_unlimited' => $isUnlimited,
            'using_own_key' => $user->isUsingOwnAiApiKey(),
            'usage_percentage' => $isUnlimited ? 0 : ($monthlyAllocation > 0
                ? round(($stats['total_tokens'] / $monthlyAllocation) * 100, 1)
                : 0),
        ];
    }

    /**
     * Get usage history for a user.
     */
    public function getUsageHistory(User $user, int $perPage = 15, string $period = 'current_month', ?bool $usedOwnApiKey = null)
    {
        return BuildCreditUsage::getUsageHistoryForUser($user->id, $perPage, $period, $usedOwnApiKey);
    }

    /**
     * Estimate tokens for a typical project build.
     */
    public function estimateProjectTokens(): int
    {
        return AiProvider::TOKENS_PER_PROJECT;
    }

    /**
     * Check if user can perform a build operation.
     * Returns an array with 'allowed' boolean and 'reason' if not allowed.
     */
    public function canPerformBuild(User $user): array
    {
        $usingOwnKey = $user->isUsingOwnAiApiKey();
        $plan = $user->getCurrentPlan();

        if (! $usingOwnKey) {
            // Check if user has a plan
            if (! $plan) {
                return [
                    'allowed' => false,
                    'reason' => __('No active plan. Please subscribe to a plan to start a project.'),
                ];
            }

            // Check if plan has build credits
            if ($plan->getMonthlyBuildCredits() === 0 && ! $plan->hasUnlimitedBuildCredits()) {
                return [
                    'allowed' => false,
                    'reason' => __('Your plan does not include AI build credits.'),
                ];
            }

            // Check remaining credits
            if (! $user->hasBuildCredits(1)) {
                return [
                    'allowed' => false,
                    'reason' => __('Insufficient build credits. Your credits will reset at the beginning of next month.'),
                ];
            }

            // Check AI provider availability
            $aiProvider = $plan->getAiProviderWithFallbacks();
            if (! $aiProvider) {
                return [
                    'allowed' => false,
                    'reason' => __('No AI provider is available for your plan. Please contact your administrator to configure AI settings.'),
                ];
            }
        }

        // Builder check — runs for ALL users (own-key users still need a builder)
        if ($plan) {
            $builder = $plan->getBuilderWithFallbacks();
            if (! $builder) {
                return [
                    'allowed' => false,
                    'reason' => __('No builder service is available for your plan. Please contact your administrator to configure builder settings.'),
                ];
            }
        }

        return ['allowed' => true, 'reason' => null];
    }

    /**
     * Broadcast credits updated event to user.
     */
    public function broadcastCreditsUpdated(User $user): void
    {
        // Refresh the user to get latest data
        $user->refresh();

        event(new UserCreditsUpdatedEvent(
            $user->id,
            $user->getRemainingBuildCredits(),
            $user->getMonthlyBuildCreditsAllocation(),
            $user->hasUnlimitedCredits(),
            $user->isUsingOwnAiApiKey()
        ));
    }

    /**
     * Check if user's credits are low and send notification if applicable.
     * Low credits = less than 20% remaining.
     */
    public function checkAndNotifyLowCredits(User $user): void
    {
        // Skip for users with unlimited credits or using own API key
        if ($user->hasUnlimitedCredits() || $user->isUsingOwnAiApiKey()) {
            return;
        }

        $monthlyAllocation = $user->getMonthlyBuildCreditsAllocation();

        // Skip if no allocation
        if ($monthlyAllocation <= 0) {
            return;
        }

        $remaining = $user->getRemainingBuildCredits();
        $percentageRemaining = ($remaining / $monthlyAllocation) * 100;

        // Notify if less than 20% remaining
        if ($percentageRemaining <= 20) {
            $this->notificationService->notifyCreditsLow($user);
        }
    }
}
