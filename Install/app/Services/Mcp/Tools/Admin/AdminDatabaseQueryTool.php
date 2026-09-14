<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * High-risk tool: executes a single raw SQL statement against one of the
 * installation's own configured Laravel database connections (the app's
 * own database — never a client project's data, which has no SQL layer of
 * its own). Requires the "database:execute" ability explicitly, which is
 * never granted by default when issuing an admin connector token.
 *
 * Guardrails, mirroring DatabaseCrudController::PROTECTED_TABLES:
 * - only a single statement per call (rejects anything with an embedded
 *   ";" beyond one optional trailing terminator, to block statement
 *   stacking);
 * - SELECT/SHOW/DESCRIBE/EXPLAIN run read-only via a prepared select();
 * - any other statement that textually touches a protected system table
 *   name is blocked outright;
 * - every call (success, failure, or block) is logged to the "mcp" log
 *   channel with the admin user id, connection, and SQL — there is no
 *   audit UI yet (that's a later phase), but this tool must never ship
 *   without a durable trace of what it executed.
 */
class AdminDatabaseQueryTool extends McpTool
{
    use ResolvesAdminTargets;

    private const PROTECTED_TABLES = [
        'users',
        'password_reset_tokens',
        'sessions',
        'jobs',
        'job_batches',
        'failed_jobs',
        'cache',
        'cache_locks',
        'migrations',
        'system_settings',
        'plugins',
        'transactions',
        'subscriptions',
        'personal_access_tokens',
        'project_ai_connector_tokens',
        'project_ai_connector_activations',
    ];

    public function name(): string
    {
        return 'admin_database_query';
    }

    public function description(): string
    {
        return "Execute a single raw SQL statement against a configured Laravel database connection (the installation's own app database, not client project data). "
            .'SELECT/SHOW/DESCRIBE/EXPLAIN run read-only. Any other statement is blocked if it textually references a protected system table '
            .'(users, transactions, subscriptions, personal_access_tokens, project_ai_connector_*, etc) unless allow_protected=true AND the token holds "database:protected". Every call is logged.';
    }

    public function requiredAbility(): ?string
    {
        return 'database:execute';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'sql' => ['type' => 'string', 'description' => 'A single SQL statement to execute.'],
                'connection' => ['type' => 'string', 'description' => 'Laravel database connection name. Defaults to the app default connection.'],
                'bindings' => ['type' => 'array', 'items' => ['type' => ['string', 'number', 'boolean', 'null']], 'description' => 'Positional ? parameter bindings.'],
                'allow_protected' => ['type' => 'boolean', 'default' => false, 'description' => 'Allow a write that touches a protected system table. Also requires the "database:protected" ability on the token.'],
            ],
            'required' => ['sql'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $sql = trim((string) ($arguments['sql'] ?? ''));

        if ($sql === '') {
            return ['success' => false, 'message' => '"sql" is required.'];
        }

        $bindings = is_array($arguments['bindings'] ?? null) ? $arguments['bindings'] : [];
        $connectionName = (string) ($arguments['connection'] ?? config('database.default'));
        $configured = array_keys((array) config('database.connections', []));

        if (! in_array($connectionName, $configured, true)) {
            return ['success' => false, 'message' => "Unknown connection: {$connectionName}"];
        }

        $normalized = rtrim($sql, "; \t\n\r");

        if (str_contains($normalized, ';')) {
            return ['success' => false, 'message' => 'Only a single SQL statement is allowed per call.'];
        }

        $isReadOnly = (bool) preg_match('/^\s*(select|show|describe|desc|explain)\b/i', $normalized);

        if (! $isReadOnly && $this->touchesProtectedTable($normalized)) {
            // Escalation needs both halves: the caller has to ask for it on
            // this specific statement, AND the token has to have been issued
            // with the ability. Either one alone keeps the block in place.
            $requested = (bool) ($arguments['allow_protected'] ?? false);
            $permitted = $this->tokenCan($context, 'database:protected');

            if (! $requested || ! $permitted) {
                $reason = $requested
                    ? 'blocked: token lacks the database:protected ability'
                    : 'blocked: references a protected system table';
                $this->log($context, $connectionName, $normalized, false, $reason);

                return [
                    'success' => false,
                    'message' => $requested
                        ? 'This statement touches a protected system table and this token does not hold the "database:protected" ability.'
                        : 'This statement references a protected system table and was blocked. Re-send with allow_protected=true (needs the database:protected ability).',
                ];
            }

            $this->log($context, $connectionName, $normalized, true, 'protected-table write explicitly authorised');
        }

        try {
            $connection = DB::connection($connectionName);

            if ($isReadOnly) {
                $rows = $connection->select($normalized, $bindings);
                $result = [
                    'success' => true,
                    'rows' => array_map(fn ($row) => (array) $row, $rows),
                    'row_count' => count($rows),
                ];
            } else {
                $connection->statement($normalized, $bindings);
                $result = ['success' => true, 'executed' => true];
            }
        } catch (\Throwable $e) {
            $this->log($context, $connectionName, $normalized, false, $e->getMessage());

            return ['success' => false, 'message' => 'Query failed: '.$e->getMessage()];
        }

        $this->log($context, $connectionName, $normalized, true, null);

        return $result;
    }

    private function touchesProtectedTable(string $sql): bool
    {
        foreach (self::PROTECTED_TABLES as $table) {
            if (preg_match('/\b'.preg_quote($table, '/').'\b/i', $sql)) {
                return true;
            }
        }

        return false;
    }

    private function log(mixed $context, string $connection, string $sql, bool $success, ?string $error): void
    {
        Log::channel('mcp')->info('admin_database_query', [
            'admin_user_id' => $context->id ?? null,
            'connection' => $connection,
            'sql' => $sql,
            'success' => $success,
            'error' => $error,
        ]);
    }
}
