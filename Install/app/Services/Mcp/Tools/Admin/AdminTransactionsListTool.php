<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Transaction;
use App\Services\Mcp\McpTool;

class AdminTransactionsListTool extends McpTool
{
    public function name(): string
    {
        return 'admin_transactions_list';
    }

    public function description(): string
    {
        return 'List billing transactions (plan subscriptions and AI Connector purchases), optionally filtered by status.';
    }

    public function requiredAbility(): ?string
    {
        return 'transactions:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'status' => ['type' => 'string', 'enum' => ['pending', 'completed', 'failed', 'refunded']],
                'per_page' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 20],
                'page' => ['type' => 'integer', 'minimum' => 1, 'default' => 1],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $perPage = min(max((int) ($arguments['per_page'] ?? 20), 1), 100);
        $page = max((int) ($arguments['page'] ?? 1), 1);

        $query = Transaction::with(['user:id,name,email', 'subscription.plan', 'connectorActivation.module'])
            ->latest('transaction_date');

        if (! empty($arguments['status'])) {
            $query->where('status', $arguments['status']);
        }

        $transactions = $query->paginate($perPage, ['*'], 'page', $page);

        return [
            'success' => true,
            'transactions' => $transactions->through(fn (Transaction $t) => [
                'id' => $t->id,
                'transaction_id' => $t->transaction_id,
                'user' => $t->user ? ['id' => $t->user->id, 'email' => $t->user->email] : null,
                'amount' => (float) $t->amount,
                'currency' => $t->currency,
                'status' => $t->status,
                'type' => $t->type,
                'payment_method' => $t->payment_method,
                'plan' => $t->subscription?->plan?->name,
                'ai_connector_module' => $t->connectorActivation?->module?->name,
                'transaction_date' => $t->transaction_date?->toIso8601String(),
            ])->values()->all(),
            'pagination' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ];
    }
}
