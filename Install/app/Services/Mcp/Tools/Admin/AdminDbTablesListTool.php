<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Database\DatabaseAdminService;
use App\Services\Mcp\McpTool;

/**
 * Schema introspection: every table on a connection, optionally with its
 * columns, or one table in detail. Marks protected tables so a caller can
 * see up front which ones need the escalation flag before it tries to
 * write to them.
 */
class AdminDbTablesListTool extends McpTool
{
    public function __construct(private readonly DatabaseAdminService $db) {}

    public function name(): string
    {
        return 'admin_db_tables_list';
    }

    public function description(): string
    {
        return 'List the tables of a database connection, with their columns when with_columns is true. '
            .'Pass "table" to introspect a single table (columns, types, nullability, primary key).';
    }

    public function requiredAbility(): ?string
    {
        return 'database:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'connection' => ['type' => 'string', 'description' => 'Connection name from admin_db_connections_list. Defaults to the app default connection.'],
                'table' => ['type' => 'string', 'description' => 'Introspect only this table.'],
                'with_columns' => ['type' => 'boolean', 'default' => false, 'description' => 'Include the column list of every table (heavier).'],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $connection = $this->db->connection($arguments['connection'] ?? null);
        $name = $this->db->resolveConnectionName($arguments['connection'] ?? null);
        $table = trim((string) ($arguments['table'] ?? ''));

        if ($table !== '') {
            $columns = $this->db->columnsFor($connection, $table);

            return [
                'success' => true,
                'connection' => $name,
                'table' => $table,
                'columns' => $columns,
                'primary_key' => $this->db->singlePrimaryKey($columns),
                'is_protected' => $this->db->isProtectedTable($table),
            ];
        }

        $withColumns = (bool) ($arguments['with_columns'] ?? false);
        $tables = $withColumns
            ? $this->db->tables($connection, true)
            : array_map(fn (string $t) => ['name' => $t], $this->db->tableNames($connection));

        $tables = array_map(function (array $t) {
            $t['is_protected'] = $this->db->isProtectedTable((string) ($t['name'] ?? ''));

            return $t;
        }, $tables);

        return ['success' => true, 'connection' => $name, 'tables' => $tables, 'count' => count($tables)];
    }
}
