<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\ProjectAiConnectorActivation;
use App\Services\Mcp\McpTool;

class AdminConnectorActivationsListTool extends McpTool
{
    public function name(): string
    {
        return 'admin_connector_activations_list';
    }

    public function description(): string
    {
        return 'List per-project AI Connector activations across all clients, optionally filtered by status (pending = awaiting bank-transfer approval).';
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

        $query = ProjectAiConnectorActivation::with(['project:id,name', 'user:id,name,email', 'module:id,name'])->latest();

        if (! empty($arguments['status'])) {
            $query->where('status', $arguments['status']);
        }

        $activations = $query->paginate($perPage, ['*'], 'page', $page);

        return [
            'success' => true,
            'activations' => $activations->through(fn (ProjectAiConnectorActivation $a) => [
                'id' => $a->id,
                'project' => $a->project ? ['id' => $a->project->id, 'name' => $a->project->name] : null,
                'user' => $a->user ? ['id' => $a->user->id, 'email' => $a->user->email] : null,
                'module' => $a->module?->name,
                'status' => $a->status,
                'amount' => (float) $a->amount,
                'payment_method' => $a->payment_method,
                'requires_approval' => $a->requiresApproval(),
                'renewal_at' => $a->renewal_at?->toIso8601String(),
            ])->values()->all(),
            'pagination' => [
                'current_page' => $activations->currentPage(),
                'last_page' => $activations->lastPage(),
                'per_page' => $activations->perPage(),
                'total' => $activations->total(),
            ],
        ];
    }
}
