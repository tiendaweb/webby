<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\AuditLog;
use App\Services\Mcp\McpTool;

class AdminAuditLogListTool extends McpTool
{
    public function name(): string
    {
        return 'admin_audit_log_list';
    }

    public function description(): string
    {
        return 'Who changed what, and what the value was before. Filter by user, action, entity or date range. '
            .'This is the tool for "who touched this account/project, and when".';
    }

    public function requiredAbility(): ?string
    {
        return 'settings:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'actor_id' => ['type' => 'integer', 'description' => 'Who performed the action.'],
                'user_id' => ['type' => 'integer', 'description' => 'Whose data was affected.'],
                'action' => ['type' => 'string', 'description' => 'e.g. "updated", "deleted".'],
                'entity_type' => ['type' => 'string', 'description' => 'e.g. "App\\\\Models\\\\Project".'],
                'entity_id' => ['type' => 'string'],
                'since' => ['type' => 'string', 'description' => 'ISO date/time lower bound.'],
                'until' => ['type' => 'string', 'description' => 'ISO date/time upper bound.'],
                'include_values' => ['type' => 'boolean', 'default' => false, 'description' => 'Include old_values/new_values. Off by default: they can be large and may hold personal data.'],
                'limit' => ['type' => 'integer', 'default' => 50, 'maximum' => 200],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $query = AuditLog::query()->with(['actor:id,name,email', 'user:id,name,email'])->latest('id');

        foreach (['actor_id', 'user_id', 'action', 'entity_type', 'entity_id'] as $campo) {
            if (($arguments[$campo] ?? null) !== null && $arguments[$campo] !== '') {
                $query->where($campo, $arguments[$campo]);
            }
        }

        if ($desde = ($arguments['since'] ?? null)) {
            $query->where('created_at', '>=', $desde);
        }
        if ($hasta = ($arguments['until'] ?? null)) {
            $query->where('created_at', '<=', $hasta);
        }

        $limite = min(max((int) ($arguments['limit'] ?? 50), 1), 200);
        $incluirValores = (bool) ($arguments['include_values'] ?? false);

        $entradas = $query->limit($limite)->get();

        return [
            'success' => true,
            'count' => $entradas->count(),
            'entries' => $entradas->map(function (AuditLog $log) use ($incluirValores) {
                $fila = [
                    'id' => $log->id,
                    'action' => $log->action,
                    'entity_type' => $log->entity_type,
                    'entity_id' => $log->entity_id,
                    'actor' => $log->actor ? ['id' => $log->actor->id, 'name' => $log->actor->name, 'email' => $log->actor->email] : null,
                    'user' => $log->user ? ['id' => $log->user->id, 'name' => $log->user->name, 'email' => $log->user->email] : null,
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at?->toIso8601String(),
                ];

                if ($incluirValores) {
                    $fila['old_values'] = $log->old_values;
                    $fila['new_values'] = $log->new_values;
                    $fila['metadata'] = $log->metadata;
                }

                return $fila;
            })->values()->all(),
        ];
    }
}
