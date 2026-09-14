<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Database\DatabaseAdminService;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;

/**
 * Insert / update / delete rows by primary key.
 *
 * One tool with an "action" rather than three near-identical ones: the
 * arguments only differ by a field, and a shorter tool list measurably
 * improves which tool a model picks on a server this size.
 *
 * Protected system tables (users, transactions, subscriptions,
 * personal_access_tokens, …) need BOTH allow_protected=true on the call AND
 * the "database:protected" ability on the token — the flag alone is not
 * enough, so a token issued without that ability can never be talked into
 * editing them.
 */
class AdminDbRowsWriteTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(private readonly DatabaseAdminService $db) {}

    public function name(): string
    {
        return 'admin_db_rows_write';
    }

    public function description(): string
    {
        return 'Insert, update or delete a single row of a table. update/delete address the row by its primary key ("row_key"). '
            .'Writing to a protected system table additionally requires allow_protected=true and a token holding the "database:protected" ability.';
    }

    public function requiredAbility(): ?string
    {
        return 'database:rows';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'action' => ['type' => 'string', 'enum' => ['insert', 'update', 'delete']],
                'connection' => ['type' => 'string'],
                'table' => ['type' => 'string'],
                'values' => ['type' => 'object', 'description' => 'Column => value map. Required for insert/update; unknown columns are dropped.'],
                'row_key' => ['type' => ['string', 'integer'], 'description' => 'Primary key value of the row to update/delete.'],
                'allow_protected' => ['type' => 'boolean', 'default' => false, 'description' => 'Opt in to touching a protected system table. Also needs the database:protected ability.'],
            ],
            'required' => ['action', 'table'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $action = (string) ($arguments['action'] ?? '');

        if (! in_array($action, ['insert', 'update', 'delete'], true)) {
            return ['success' => false, 'message' => '"action" must be one of: insert, update, delete.'];
        }

        $table = trim((string) ($arguments['table'] ?? ''));

        if ($table === '') {
            return ['success' => false, 'message' => '"table" is required.'];
        }

        $wantsProtected = (bool) ($arguments['allow_protected'] ?? false);

        if ($wantsProtected && ! $this->tokenCan($context, 'database:protected')) {
            return [
                'success' => false,
                'message' => 'allow_protected was requested but this token does not hold the "database:protected" ability. Issue a token with it from the Connect screen.',
            ];
        }

        if ($this->db->isProtectedTable($table) && ! $wantsProtected) {
            return [
                'success' => false,
                'message' => "\"{$table}\" is a protected system table. Re-send with allow_protected=true if you really mean to change it.",
            ];
        }

        $connection = $this->db->connection($arguments['connection'] ?? null);
        $values = is_array($arguments['values'] ?? null) ? $arguments['values'] : [];
        $rowKey = $arguments['row_key'] ?? null;

        try {
            $result = match ($action) {
                'insert' => $this->db->insertRow($connection, $table, $values, $wantsProtected),
                'update' => $rowKey === null
                    ? throw new \RuntimeException('"row_key" is required to update a row.')
                    : $this->db->updateRow($connection, $table, (string) $rowKey, $values, $wantsProtected),
                'delete' => $rowKey === null
                    ? throw new \RuntimeException('"row_key" is required to delete a row.')
                    : $this->db->deleteRow($connection, $table, (string) $rowKey, $wantsProtected),
            };
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return ['success' => true, 'action' => $action, 'table' => $table] + $result;
    }
}
