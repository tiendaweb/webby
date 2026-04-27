<?php

namespace App\Listeners;

use App\Events\Builder\BuilderCompleteEvent;
use App\Models\BuildCreditUsage;
use App\Models\Project;
use App\Services\BuildCreditService;
use Illuminate\Support\Facades\Log;

class TrackBuildCreditUsage
{
    public function __construct(
        protected BuildCreditService $creditService
    ) {}

    public function handle(BuilderCompleteEvent $event): void
    {
        // Skip if no tokens were used
        if ($event->tokensUsed <= 0) {
            return;
        }

        // Find the project by session ID
        $project = Project::where('build_session_id', $event->sessionId)
            ->with('user')
            ->first();

        if (! $project || ! $project->user) {
            return;
        }

        $user = $project->user;

        // Get the AI provider from user's plan
        $provider = null;
        $plan = $user->getCurrentPlan();

        if ($plan) {
            $provider = $plan->getAiProviderWithFallbacks();
        }

        // Use detailed token info if available, otherwise estimate (60/40 split)
        if ($event->promptTokens !== null && $event->completionTokens !== null) {
            $promptTokens = $event->promptTokens;
            $completionTokens = $event->completionTokens;
        } else {
            $totalTokens = $event->tokensUsed;
            $promptTokens = (int) ($totalTokens * 0.6);
            $completionTokens = $totalTokens - $promptTokens;
        }

        // Use model from event if available, otherwise get from provider
        $model = $event->model ?? $provider?->getDefaultModel() ?? 'unknown';

        // Calculate estimated cost
        $estimatedCost = 0;
        if ($provider) {
            $estimatedCost = $provider->calculateCost($promptTokens, $completionTokens, $model);
        }

        $usedOwnApiKey = $user->isUsingOwnAiApiKey();

        // IDEMPOTENCY: If we have an event ID, use firstOrCreate to prevent duplicates
        if ($event->eventId) {
            $usage = BuildCreditUsage::firstOrCreate(
                ['builder_event_id' => $event->eventId],
                [
                    'user_id' => $user->id,
                    'project_id' => $project->id,
                    'ai_provider_id' => $provider?->id,
                    'model' => $model,
                    'prompt_tokens' => $promptTokens,
                    'completion_tokens' => $completionTokens,
                    'total_tokens' => $event->tokensUsed,
                    'estimated_cost' => $estimatedCost,
                    'action' => 'build',
                    'used_own_api_key' => $usedOwnApiKey,
                ]
            );

            // Only deduct credits if this was a NEW record (not duplicate)
            if ($usage->wasRecentlyCreated) {
                if (! $usedOwnApiKey) {
                    $user->deductBuildCredits($event->tokensUsed);
                }

                // Broadcast updated credits to frontend and check for low credits
                $this->creditService->broadcastCreditsUpdated($user);
                $this->creditService->checkAndNotifyLowCredits($user);

                Log::info('Build credit usage tracked', [
                    'event_id' => $event->eventId,
                    'user_id' => $user->id,
                    'tokens' => $event->tokensUsed,
                ]);
            } else {
                Log::info('Duplicate webhook ignored (idempotent)', [
                    'event_id' => $event->eventId,
                    'session_id' => $event->sessionId,
                ]);
            }
        } else {
            // Backwards compatibility: no event ID, use original logic
            $this->creditService->trackUsage(
                user: $user,
                promptTokens: $promptTokens,
                completionTokens: $completionTokens,
                model: $model,
                provider: $provider,
                project: $project,
                action: 'build',
                usedOwnApiKey: $usedOwnApiKey
            );
        }
    }
}
