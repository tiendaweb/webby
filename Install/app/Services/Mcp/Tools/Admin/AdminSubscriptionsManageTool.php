<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Subscription;
use App\Services\Mcp\McpTool;

/**
 * Consolidates AdminSubscriptionController::extend()/cancel()/approve()
 * into one tool selected by `action`, to keep the admin tool count
 * manageable — each branch mirrors that controller method's logic exactly.
 */
class AdminSubscriptionsManageTool extends McpTool
{
    public function name(): string
    {
        return 'admin_subscriptions_manage';
    }

    public function description(): string
    {
        return 'Extend, cancel, or approve a plan subscription.';
    }

    public function requiredAbility(): ?string
    {
        return 'subscriptions:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'subscription_id' => ['type' => 'integer'],
                'action' => ['type' => 'string', 'enum' => ['extend', 'cancel', 'approve']],
                'days' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 365, 'description' => 'Required for action=extend.'],
                'immediate' => ['type' => 'boolean', 'description' => 'For action=cancel: end access immediately.'],
                'reason' => ['type' => 'string'],
            ],
            'required' => ['subscription_id', 'action'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $subscription = Subscription::find((int) ($arguments['subscription_id'] ?? 0));

        if (! $subscription) {
            return ['success' => false, 'message' => 'Subscription not found.'];
        }

        /** @var \App\Models\User $admin */
        $admin = $context;
        $reason = (string) ($arguments['reason'] ?? '');

        return match ($arguments['action'] ?? '') {
            'extend' => $this->extend($subscription, (int) ($arguments['days'] ?? 0), $reason),
            'cancel' => $this->cancel($subscription, $admin, (bool) ($arguments['immediate'] ?? false), $reason),
            'approve' => $this->approve($subscription, $admin, $reason),
            default => ['success' => false, 'message' => 'Unknown action.'],
        };
    }

    private function extend(Subscription $subscription, int $days, string $reason): array
    {
        if ($days < 1) {
            return ['success' => false, 'message' => '"days" must be at least 1.'];
        }

        $subscription->extend($days);
        $subscription->refresh();

        return ['success' => true, 'renewal_at' => $subscription->renewal_at?->toIso8601String()];
    }

    private function cancel(Subscription $subscription, \App\Models\User $admin, bool $immediate, string $reason): array
    {
        $subscription->cancel($admin->id, $immediate, $reason ?: null);

        if ($immediate) {
            $subscription->user->update(['plan_id' => null]);
        }

        return ['success' => true, 'status' => $subscription->fresh()->status];
    }

    private function approve(Subscription $subscription, \App\Models\User $admin, string $reason): array
    {
        if (! $subscription->isPending()) {
            return ['success' => false, 'message' => 'Only pending subscriptions can be approved.'];
        }

        $subscription->approve($admin, $reason ?: null);

        return ['success' => true, 'status' => $subscription->fresh()->status];
    }
}
