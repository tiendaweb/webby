<?php

namespace App\Services\Mcp;

use App\Models\McpToolCall;
use Illuminate\Http\Request;

/**
 * Records every tools/call invocation (both servers) to mcp_tool_calls.
 * Deliberately swallows its own failures — an audit-logging bug must never
 * take down the actual tool call it's trying to log.
 */
class McpAuditLogger
{
    public function log(
        Request $request,
        string $server,
        string $toolName,
        array $arguments,
        bool $success,
        ?string $errorMessage,
        int $durationMs,
        ?int $adminUserId = null,
        ?string $projectId = null,
        ?int $connectorTokenId = null
    ): void {
        try {
            McpToolCall::create([
                'server' => $server,
                'tool_name' => $toolName,
                'admin_user_id' => $adminUserId,
                'project_id' => $projectId,
                'connector_token_id' => $connectorTokenId,
                'arguments' => $this->redact($arguments),
                'success' => $success,
                'error_message' => $errorMessage ? mb_substr($errorMessage, 0, 2000) : null,
                'ip_address' => $request->ip(),
                'duration_ms' => $durationMs,
            ]);
        } catch (\Throwable) {
            // never let audit logging break the actual tool call
        }
    }

    /**
     * Strip obviously sensitive argument values (raw file content,
     * passwords, api keys, sql bindings that might carry secrets) before
     * persisting — the audit log records WHAT was called, not necessarily
     * every byte of payload content.
     */
    private function redact(array $arguments): array
    {
        $sensitiveKeys = ['content', 'password', 'api_key', 'token', 'bindings'];

        foreach ($arguments as $key => $value) {
            if (in_array($key, $sensitiveKeys, true)) {
                $arguments[$key] = is_string($value) ? '['.strlen($value).' chars redacted]' : '[redacted]';
            }
        }

        return $arguments;
    }
}
