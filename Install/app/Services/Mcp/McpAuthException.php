<?php

namespace App\Services\Mcp;

use RuntimeException;

/**
 * Thrown when an MCP request's caller cannot be resolved into a valid
 * context (missing/invalid/expired credential, inactive activation, not an
 * admin, etc). Carries a JSON-RPC error code so the controller can respond
 * in the shape an MCP client expects rather than a bare HTTP status.
 */
class McpAuthException extends RuntimeException
{
    public function __construct(string $message, private readonly int $jsonRpcCode = -32001)
    {
        parent::__construct($message);
    }

    public function jsonRpcCode(): int
    {
        return $this->jsonRpcCode;
    }
}
