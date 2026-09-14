<?php

namespace App\Services\Mcp;

/**
 * Holds two disjoint tool sets ("admin" and "project") so an admin tool can
 * never be reachable from the project-scoped MCP endpoint, or vice versa,
 * regardless of registration order or mistakes in individual tool classes.
 */
class McpToolRegistry
{
    /** @var array<string, array<string, McpTool>> */
    private array $tools = [
        'admin' => [],
        'project' => [],
    ];

    public function register(string $server, McpTool $tool): void
    {
        $this->assertKnownServer($server);

        $this->tools[$server][$tool->name()] = $tool;
    }

    /**
     * @return McpTool[]
     */
    public function all(string $server): array
    {
        $this->assertKnownServer($server);

        return array_values($this->tools[$server]);
    }

    public function find(string $server, string $name): ?McpTool
    {
        $this->assertKnownServer($server);

        return $this->tools[$server][$name] ?? null;
    }

    private function assertKnownServer(string $server): void
    {
        if (! array_key_exists($server, $this->tools)) {
            throw new \InvalidArgumentException("Unknown MCP server: {$server}");
        }
    }
}
