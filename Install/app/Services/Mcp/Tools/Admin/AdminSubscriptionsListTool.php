<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Subscription;
use App\Services\Mcp\McpTool;

class AdminSubscriptionsListTool extends McpTool
{
    public function name(): string
    {
        return 'admin_subscriptions_list';
    }

    public function description(): string
    {
        return 'List account-wide plan subscriptions, optionally filtered by status.';
    }

    public function requiredAbility(): ?string
    {
        return 'subscriptions:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'status' => ['type' => 'string', 'enum' => ['active', 'pending', 'expired', 'cancelled']],
                'per_page' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 20],
                'page' => ['type' => 'integer', 'minimum' => 1, 'default' => 1],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $perPage = min(max((int) ($arguments['per_page'] ?? 20), 1), 100);
        $page = max((int) ($arguments['page'] ?? 1), 1);

        $query = Subscription::with(['user:id,name,email', 'plan:id,name'])->latest();

        if (! empty($arguments['status'])) {
            $query->where('status', $arguments['status']);
        }

        $subs = $query->paginate($perPage, ['*'], 'page', $page);

        return [
            'success' => true,
            'subscriptions' => $subs->through(fn (Subscription $s) => [
                'id' => $s->id,
                'user' => $s->user ? ['id' => $s->user->id, 'email' => $s->user->email] : null,
                'plan' => $s->plan?->name,
                'status' => $s->status,
                'amount' => (float) $s->amount,
                'payment_method' => $s->payment_method,
                'starts_at' => $s->starts_at?->toIso8601String(),
                'renewal_at' => $s->renewal_at?->toIso8601String(),
            ])->values()->all(),
            'pagination' => [
                'current_page' => $subs->currentPage(),
                'last_page' => $subs->lastPage(),
                'per_page' => $subs->perPage(),
                'total' => $subs->total(),
            ],
        ];
    }
}
