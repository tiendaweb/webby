<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\McpToolCall;
use App\Services\Mcp\McpTool;
use Illuminate\Support\Facades\DB;

class AdminMcpCallsListTool extends McpTool
{
    public function name(): string
    {
        return 'admin_mcp_calls_list';
    }

    public function description(): string
    {
        return 'What the connectors have been doing: every tool call with its arguments, duration and error. '
            .'Use it to answer "what did the assistant change yesterday" or to find out why a connector keeps failing. '
            .'With stats=true it returns counts per tool instead of the calls themselves.';
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
                'server' => ['type' => 'string', 'enum' => ['admin', 'project'], 'description' => 'Which MCP server the call went to.'],
                'tool_name' => ['type' => 'string'],
                'project_id' => ['type' => 'string'],
                'admin_user_id' => ['type' => 'integer'],
                'only_failures' => ['type' => 'boolean', 'default' => false],
                'since' => ['type' => 'string', 'description' => 'ISO date/time lower bound.'],
                'stats' => ['type' => 'boolean', 'default' => false, 'description' => 'Return per-tool counts, failures and average duration instead of individual calls.'],
                'limit' => ['type' => 'integer', 'default' => 50, 'maximum' => 200],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $base = McpToolCall::query();

        foreach (['server', 'tool_name', 'project_id', 'admin_user_id'] as $campo) {
            if (($arguments[$campo] ?? null) !== null && $arguments[$campo] !== '') {
                $base->where($campo, $arguments[$campo]);
            }
        }

        if ($arguments['only_failures'] ?? false) {
            $base->where('success', false);
        }

        if ($desde = ($arguments['since'] ?? null)) {
            $base->where('created_at', '>=', $desde);
        }

        if ($arguments['stats'] ?? false) {
            $filas = (clone $base)
                ->select('tool_name', DB::raw('COUNT(*) as calls'))
                ->selectRaw('SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failures')
                ->selectRaw('ROUND(AVG(duration_ms)) as avg_ms')
                ->groupBy('tool_name')
                ->orderByDesc('calls')
                ->get();

            return [
                'success' => true,
                'by_tool' => $filas->map(fn ($f) => [
                    'tool_name' => $f->tool_name,
                    'calls' => (int) $f->calls,
                    'failures' => (int) $f->failures,
                    'avg_ms' => $f->avg_ms === null ? null : (int) $f->avg_ms,
                ])->values()->all(),
            ];
        }

        $limite = min(max((int) ($arguments['limit'] ?? 50), 1), 200);
        $llamadas = $base->latest('id')->limit($limite)->get();

        return [
            'success' => true,
            'count' => $llamadas->count(),
            'calls' => $llamadas->map(fn (McpToolCall $c) => [
                'id' => $c->id,
                'server' => $c->server,
                'tool_name' => $c->tool_name,
                'success' => (bool) $c->success,
                'error_message' => $c->error_message,
                'duration_ms' => $c->duration_ms,
                'project_id' => $c->project_id,
                'admin_user_id' => $c->admin_user_id,
                // Los argumentos pueden traer el contenido entero de un
                // fichero. Se recortan: quien necesite el detalle exacto
                // tiene el id para ir a buscarlo.
                'arguments' => is_array($c->arguments)
                    ? json_decode(mb_substr(json_encode($c->arguments) ?: '{}', 0, 1000), true) ?? ['(truncated)' => true]
                    : $c->arguments,
                'ip_address' => $c->ip_address,
                'created_at' => $c->created_at?->toIso8601String(),
            ])->values()->all(),
        ];
    }
}
