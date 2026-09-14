<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\ProjectAiConnectorActivation;
use App\Models\Subscription;
use App\Models\Transaction;
use App\Services\Mcp\McpTool;

/**
 * Mirrors AdminTransactionController::approve()/reject() for pending
 * transactions, extended to also flip a linked ProjectAiConnectorActivation
 * (not just a Subscription) since Transaction can now link to either.
 */
class AdminTransactionsReviewTool extends McpTool
{
    public function name(): string
    {
        return 'admin_transactions_review';
    }

    public function description(): string
    {
        return 'Approve or reject a pending transaction (e.g. a pending bank-transfer plan subscription or AI Connector activation).';
    }

    public function requiredAbility(): ?string
    {
        return 'transactions:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'transaction_id' => ['type' => 'integer'],
                'action' => ['type' => 'string', 'enum' => ['approve', 'reject']],
                'notes' => ['type' => 'string'],
            ],
            'required' => ['transaction_id', 'action'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $transaction = Transaction::with(['subscription', 'connectorActivation'])
            ->find((int) ($arguments['transaction_id'] ?? 0));

        if (! $transaction) {
            return ['success' => false, 'message' => 'Transaction not found.'];
        }

        if ($transaction->status !== Transaction::STATUS_PENDING) {
            return ['success' => false, 'message' => 'Only pending transactions can be reviewed.'];
        }

        /** @var \App\Models\User $admin */
        $admin = $context;
        $notes = (string) ($arguments['notes'] ?? '');
        $approve = ($arguments['action'] ?? '') === 'approve';

        $transaction->update([
            'status' => $approve ? Transaction::STATUS_COMPLETED : Transaction::STATUS_FAILED,
            'processed_by' => $admin->id,
            'notes' => $notes !== '' ? $notes : ($approve ? 'Approved via MCP admin connector' : 'Rejected via MCP admin connector'),
        ]);

        if ($approve) {
            if ($transaction->subscription && $transaction->subscription->status === Subscription::STATUS_PENDING) {
                $transaction->subscription->approve($admin, $notes ?: null);
            }
            if ($transaction->connectorActivation && $transaction->connectorActivation->status === ProjectAiConnectorActivation::STATUS_PENDING) {
                $transaction->connectorActivation->approve($admin, $notes ?: null);
            }
        } else {
            if ($transaction->subscription && $transaction->subscription->status === Subscription::STATUS_PENDING) {
                $transaction->subscription->update([
                    'status' => Subscription::STATUS_CANCELLED,
                    'cancelled_at' => now(),
                    'admin_notes' => 'Payment rejected: '.$notes,
                ]);
            }
            if ($transaction->connectorActivation && $transaction->connectorActivation->status === ProjectAiConnectorActivation::STATUS_PENDING) {
                $transaction->connectorActivation->reject($admin, $notes ?: null);
            }
        }

        return ['success' => true, 'transaction' => $transaction->fresh()->only(['id', 'status', 'notes'])];
    }
}
