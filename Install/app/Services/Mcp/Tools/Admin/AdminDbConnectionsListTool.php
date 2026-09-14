<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Database\DatabaseAdminService;
use App\Services\Mcp\McpTool;

/**
 * Discovery entry point for the database tools: which Laravel connections
 * this installation has, whether each one actually answers, and how many
 * tables it holds. Call this before any other admin_db_* tool so the
 * "connection" argument is a real name instead of a guess.
 */
class AdminDbConnectionsListTool extends McpTool
{
    public function __construct(private readonly DatabaseAdminService $db) {}

    public function name(): string
    {
        return 'admin_db_connections_list';
    }

    public function description(): string
    {
        return 'List every configured database connection (name, driver, database, whether it is the default) with a reachability probe and table count. '
            .'Start here before using the other admin_db_* tools.';
    }

    public function requiredAbility(): ?string
    {
        return 'database:read';
    }

    public function inputSchema(): array
    {
        return ['type' => 'object', 'properties' => new \stdClass];
    }

    public function handle(array $arguments, mixed $context): array
    {
        return [
            'success' => true,
            'default' => config('database.default'),
            'connections' => $this->db->connectionCandidates(),
            'protected_tables' => DatabaseAdminService::PROTECTED_TABLES,
        ];
    }
}
