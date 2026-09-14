<?php

namespace App\Services\Mcp;

/**
 * Base class for one MCP tool. Concrete tools live under
 * app/Services/Mcp/Tools/{Admin,Project}/ and are registered with
 * McpToolRegistry by app/Providers/McpServiceProvider.php — this is the
 * mechanism for adding tool coverage incrementally (one new file + one
 * register() call) without growing the dispatcher controllers.
 */
abstract class McpTool
{
    /**
     * Stable tool name exposed via tools/list and used as the tools/call
     * dispatch key, e.g. "admin_users_list".
     */
    abstract public function name(): string;

    /**
     * Human/LLM-facing description shown in tools/list.
     */
    abstract public function description(): string;

    /**
     * JSON Schema for this tool's `arguments` object, per the MCP spec.
     */
    abstract public function inputSchema(): array;

    /**
     * Ability/scope string required to call this tool, or null if any
     * authenticated caller on this server may call it. Admin tools check
     * this against the Sanctum token's abilities; project tools check it
     * against the connector token's `scopes` column.
     */
    public function requiredAbility(): ?string
    {
        return null;
    }

    /**
     * Execute the tool. $context is the authenticated admin User (admin
     * server) or ['project' => Project, 'token' => ProjectAiConnectorToken]
     * (project server). Must return an array shaped
     * ['success' => bool, 'message' => ?string, ...data] — this becomes the
     * JSON text content of the MCP tool result.
     */
    abstract public function handle(array $arguments, mixed $context): array;
}
