<?php

namespace App\Observers;

use App\Models\Subscription;
use Illuminate\Support\Facades\Log;

class SubscriptionObserver
{
    /**
     * Handle the Subscription "created" event.
     *
     * Refill build credits when a subscription is created as active
     * (e.g., admin manual creation, payment gateway, referral credits).
     */
    public function created(Subscription $subscription): void
    {
        if ($subscription->status === Subscription::STATUS_ACTIVE) {
            $this->refillUserCredits($subscription);
        }
    }

    /**
     * Handle the Subscription "updated" event.
     *
     * Refill build credits when a subscription transitions to active
     * (e.g., admin approval of pending subscription).
     */
    public function updated(Subscription $subscription): void
    {
        if ($subscription->wasChanged('status') && $subscription->status === Subscription::STATUS_ACTIVE) {
            $this->refillUserCredits($subscription);
        }
    }

    /**
     * Refill the subscription user's build credits based on the plan allocation.
     *
     * Uses the subscription's plan directly to avoid querying the user's
     * activeSubscription relationship during model events. Updates plan_id
     * alongside build_credits so that subsequent plan_id updates (e.g., in
     * Subscription::approve()) find no dirty attributes and don't re-trigger
     * the UserObserver's refill logic.
     */
    protected function refillUserCredits(Subscription $subscription): void
    {
        $user = $subscription->user;

        if (! $user) {
            return;
        }

        $plan = $subscription->plan;

        if (! $plan) {
            return;
        }

        Log::info('Subscription activated, refilling build credits', [
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
            'plan_id' => $plan->id,
            'unlimited' => $plan->hasUnlimitedBuildCredits(),
        ]);

        $updates = ['plan_id' => $plan->id];

        if (! $plan->hasUnlimitedBuildCredits()) {
            $updates['build_credits'] = $plan->getMonthlyBuildCredits();
            $updates['credits_reset_at'] = now();
        }

        $user->updateQuietly($updates);
    }
}
