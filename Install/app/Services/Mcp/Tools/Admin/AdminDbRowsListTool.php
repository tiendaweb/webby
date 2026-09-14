<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Database\DatabaseAdminService;
use App\Services\Mcp\McpTool;

/**
 * Paginated row reader with an optional raw WHERE fragment. The fragment is
 * passed to whereRaw with positional bindings kept separate, so a caller
 * can filter without this tool becoming a second raw-SQL surface (that is
 * admin_database_query, behind its own ability).
 */
class AdminDbRowsListTool extends McpTool
{
    public function __construct(private readonly DatabaseAdminService $db) {}

    public function name(): string
    {
        return 'admin_db_rows_list';
    }

    public function description(): string
    {
        return 'Read rows from a table, paginated, with an optional WHERE fragment and positional ? bindings '
            .'(e.g. where="email LIKE ?", bindings=["%@gmail.com"]). Returns the columns and the primary key alongside the rows.';
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
                'connection' => ['type' => 'string'],
                'table' => ['type' => 'string'],
                'page' => ['type' => 'integer', 'minimum' => 1, 'default' => 1],
                'per_page' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 500, 'default' => 50],
                'where' => ['type' => 'string', 'description' => 'Raw WHERE fragment with ? placeholders. No ORDER BY / LIMIT — use page/per_page.'],
                'bindings' => ['type' => 'array', 'items' => ['type' => ['string', 'number', 'boolean', 'null']]],
            ],
            'required' => ['table'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $table = trim((string) ($arguments['table'] ?? ''));

        if ($table === '') {
            return ['success' => false, 'message' => '"table" is required.'];
        }

        $connection = $this->db->connection($arguments['connection'] ?? null);

        $result = $this->db->rows(
            $connection,
            $table,
            (int) ($arguments['page'] ?? 1),
            (int) ($arguments['per_page'] ?? 50),
            isset($arguments['where']) ? (string) $arguments['where'] : null,
            is_array($arguments['bindings'] ?? null) ? $arguments['bindings'] : [],
        );

        return ['success' => true, 'connection' => $this->db->resolveConnectionName($arguments['connection'] ?? null)] + $result;
    }
}
