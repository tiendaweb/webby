<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\ProjectAiConnectorActivation;
use App\Models\Transaction;
use App\Services\Mcp\McpTool;

class AdminConnectorActivationsReviewTool extends McpTool
{
    public function name(): string
    {
        return 'admin_connector_activations_review';
    }

    public function description(): string
    {
        return 'Approve or reject a pending AI Connector activation (bank-transfer purchase awaiting confirmation).';
    }

    public function requiredAbility(): ?string
    {
        return 'connectors:manage';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'activation_id' => ['type' => 'integer'],
                'action' => ['type' => 'string', 'enum' => ['approve', 'reject']],
                'notes' => ['type' => 'string'],
            ],
            'required' => ['activation_id', 'action'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $activation = ProjectAiConnectorActivation::find((int) ($arguments['activation_id'] ?? 0));

        if (! $activation) {
            return ['success' => false, 'message' => 'Activation not found.'];
        }

        /** @var \App\Models\User $admin */
        $admin = $context;
        $notes = (string) ($arguments['notes'] ?? '');
        $approve = ($arguments['action'] ?? '') === 'approve';

        if (! $activation->requiresApproval()) {
            return ['success' => false, 'message' => 'This activation is not awaiting approval.'];
        }

        if ($approve) {
            $activation->approve($admin, $notes ?: null);
        } else {
            $activation->reject($admin, $notes ?: null);
        }

        Transaction::where('ai_connector_activation_id', $activation->id)
            ->where('status', Transaction::STATUS_PENDING)
            ->update([
                'status' => $approve ? Transaction::STATUS_COMPLETED : Transaction::STATUS_FAILED,
                'processed_by' => $admin->id,
                'notes' => $notes !== '' ? $notes : ($approve ? 'Approved via MCP admin connector' : 'Rejected via MCP admin connector'),
            ]);

        return ['success' => true, 'status' => $activation->fresh()->status];
    }
}
