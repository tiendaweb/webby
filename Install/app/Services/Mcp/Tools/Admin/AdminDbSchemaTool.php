<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Database\DatabaseAdminService;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;

/**
 * Schema mutation: create/rename/drop a table, add/drop a column. This is
 * how a connector builds the backing storage for a site it is generating
 * ("crear/editar bases de datos") without dropping to raw SQL.
 *
 * Dropping a table or a column also requires confirm=true, because those
 * are the two operations here that destroy data no revision can bring back.
 * Protected system tables are refused outright unless the token carries
 * "database:protected" and the call sets allow_protected=true.
 */
class AdminDbSchemaTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(private readonly DatabaseAdminService $db) {}

    public function name(): string
    {
        return 'admin_db_schema';
    }

    public function description(): string
    {
        return 'Create, rename or drop a table, or add/drop a column. Destructive actions (drop_table, drop_column) require confirm=true. '
            .'Column definitions look like {"name":"title","type":"string","nullable":false,"primary":false}. '
            .'Supported types: increments, integer, bigint, string, text, boolean, date, datetime, decimal, float, json (anything else becomes TEXT).';
    }

    public function requiredAbility(): ?string
    {
        return 'database:schema';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'action' => ['type' => 'string', 'enum' => ['create_table', 'rename_table', 'drop_table', 'add_column', 'drop_column']],
                'connection' => ['type' => 'string'],
                'table' => ['type' => 'string'],
                'new_name' => ['type' => 'string', 'description' => 'Target name for rename_table.'],
                'columns' => [
                    'type' => 'array',
                    'description' => 'Column definitions for create_table.',
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'name' => ['type' => 'string'],
                            'type' => ['type' => 'string'],
                            'nullable' => ['type' => 'boolean', 'default' => true],
                            'primary' => ['type' => 'boolean', 'default' => false],
                            'auto_increment' => ['type' => 'boolean', 'default' => false],
                        ],
                        'required' => ['name', 'type'],
                    ],
                ],
                'with_timestamps' => ['type' => 'boolean', 'default' => false, 'description' => 'Add created_at/updated_at on create_table.'],
                'column' => ['type' => 'string', 'description' => 'Column name for add_column/drop_column.'],
                'type' => ['type' => 'string', 'description' => 'Column type for add_column.'],
                'nullable' => ['type' => 'boolean', 'default' => true],
                'confirm' => ['type' => 'boolean', 'default' => false, 'description' => 'Required for drop_table and drop_column.'],
                'allow_protected' => ['type' => 'boolean', 'default' => false],
            ],
            'required' => ['action', 'table'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $action = (string) ($arguments['action'] ?? '');
        $known = ['create_table', 'rename_table', 'drop_table', 'add_column', 'drop_column'];

        if (! in_array($action, $known, true)) {
            return ['success' => false, 'message' => '"action" must be one of: '.implode(', ', $known).'.'];
        }

        $table = trim((string) ($arguments['table'] ?? ''));

        if ($table === '') {
            return ['success' => false, 'message' => '"table" is required.'];
        }

        if (in_array($action, ['drop_table', 'drop_column'], true) && ! ($arguments['confirm'] ?? false)) {
            return ['success' => false, 'message' => "\"{$action}\" destroys data permanently. Re-send with confirm=true."];
        }

        $wantsProtected = (bool) ($arguments['allow_protected'] ?? false);

        if ($wantsProtected && ! $this->tokenCan($context, 'database:protected')) {
            return [
                'success' => false,
                'message' => 'allow_protected was requested but this token does not hold the "database:protected" ability.',
            ];
        }

        $connection = $this->db->connection($arguments['connection'] ?? null);

        try {
            $result = match ($action) {
                'create_table' => $this->db->createTable(
                    $connection,
                    $table,
                    is_array($arguments['columns'] ?? null) ? $arguments['columns'] : [],
                    (bool) ($arguments['with_timestamps'] ?? false),
                    $wantsProtected,
                ),
                'rename_table' => $this->db->renameTable($connection, $table, (string) ($arguments['new_name'] ?? ''), $wantsProtected),
                'drop_table' => $this->db->dropTable($connection, $table, $wantsProtected),
                'add_column' => $this->db->addColumn(
                    $connection,
                    $table,
                    (string) ($arguments['column'] ?? ''),
                    (string) ($arguments['type'] ?? 'text'),
                    (bool) ($arguments['nullable'] ?? true),
                    $wantsProtected,
                ),
                'drop_column' => $this->db->dropColumn($connection, $table, (string) ($arguments['column'] ?? ''), $wantsProtected),
            };
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return ['success' => true, 'action' => $action] + $result;
    }
}
