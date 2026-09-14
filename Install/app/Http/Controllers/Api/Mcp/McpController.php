<?php

namespace App\Http\Controllers\Api\Mcp;

use App\Http\Controllers\Controller;
use App\Services\Mcp\McpAuditLogger;
use App\Services\Mcp\McpAuthException;
use App\Services\Mcp\McpTool;
use App\Services\Mcp\McpToolRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Thin JSON-RPC 2.0 dispatcher shared by the admin and project MCP
 * endpoints (Streamable HTTP transport, non-streaming: one JSON response
 * per POST). Handles initialize/tools-list/tools-call protocol plumbing
 * only — all business logic lives in individual McpTool subclasses,
 * resolved through McpToolRegistry.
 *
 * Client compatibility notes (Claude, ChatGPT and Grok all speak
 * Streamable HTTP, but not the same revision of it):
 * - the protocol version is negotiated, not hardcoded: whatever the client
 *   asks for in initialize is echoed back when we support it, otherwise we
 *   answer with the newest revision we implement. Answering 2024-11-05 to a
 *   client that asked for 2025-06-18 makes some clients drop the session.
 * - prompts/list, resources/list and resources/templates/list are answered
 *   with empty collections instead of "method not found": several clients
 *   probe them right after initialize and treat -32601 as a broken server
 *   even though this server only advertises the "tools" capability.
 * - a JSON-RPC batch (top-level array) is accepted, since 2025-03-26
 *   clients may send one.
 *
 * @see https://modelcontextprotocol.io/specification
 */
abstract class McpController extends Controller
{
    /**
     * Newest first — index 0 is what we answer with when the client asks
     * for something we do not know.
     */
    protected const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

    public function __construct(protected McpToolRegistry $registry, protected McpAuditLogger $auditLogger) {}

    abstract protected function serverName(): string;

    abstract protected function serverLabel(): string;

    /**
     * Resolve the authenticated caller into a tool-handler context, or
     * throw McpAuthException. For the admin server this is the admin User;
     * for the project server it's ['project' => Project, 'token' => token]
     * (already validated by VerifyConnectorToken before this runs).
     */
    abstract protected function resolveContext(Request $request): mixed;

    abstract protected function authorizeTool(McpTool $tool, mixed $context): bool;

    /**
     * Extract audit-log identity columns from a resolved context.
     *
     * @return array{admin_user_id: ?int, project_id: ?string, connector_token_id: ?int}
     */
    abstract protected function auditContext(mixed $context): array;

    public function handle(Request $request): JsonResponse
    {
        $payload = $request->json()->all();

        // JSON-RPC batch: answer each member, drop the notifications, and
        // return 202 when nothing in the batch expected a response.
        if (is_array($payload) && array_is_list($payload)) {
            $context = null;

            try {
                $context = $this->resolveContext($request);
            } catch (McpAuthException $e) {
                return $this->authError($e, null);
            }

            $responses = [];

            foreach ($payload as $member) {
                $response = $this->dispatch($request, (array) $member, $context);

                if ($response !== null) {
                    $responses[] = $response;
                }
            }

            return $responses === []
                ? response()->json(null, 202)
                : $this->withSessionHeader(response()->json($responses), $request);
        }

        $payload = (array) $payload;
        $id = $payload['id'] ?? null;
        $method = $payload['method'] ?? null;

        if (! is_string($method) || $method === '') {
            return $this->error($id, -32600, 'Invalid Request: "method" is required.');
        }

        // Notifications (no "id") never expect a response body.
        if ($id === null && str_starts_with($method, 'notifications/')) {
            return response()->json(null, 202);
        }

        try {
            $context = $this->resolveContext($request);
        } catch (McpAuthException $e) {
            return $this->authError($e, $id);
        }

        $result = $this->dispatch($request, $payload, $context);

        return $result === null
            ? response()->json(null, 202)
            : $this->withSessionHeader(response()->json($result), $request);
    }

    /**
     * Answer a single JSON-RPC message, or null when it was a notification.
     */
    protected function dispatch(Request $request, array $message, mixed $context): ?array
    {
        $id = $message['id'] ?? null;
        $method = $message['method'] ?? null;
        $params = is_array($message['params'] ?? null) ? $message['params'] : [];

        if (! is_string($method) || $method === '') {
            return $this->errorBody($id, -32600, 'Invalid Request: "method" is required.');
        }

        if ($id === null && str_starts_with($method, 'notifications/')) {
            return null;
        }

        return match ($method) {
            'initialize' => $this->successBody($id, $this->initializeResult($params)),
            'tools/list' => $this->successBody($id, ['tools' => $this->toolsList()]),
            'tools/call' => $this->callTool($request, $id, $params, $context),
            'ping' => $this->successBody($id, []),
            // Answered rather than rejected — see the class docblock.
            'prompts/list' => $this->successBody($id, ['prompts' => []]),
            'resources/list' => $this->successBody($id, ['resources' => []]),
            'resources/templates/list' => $this->successBody($id, ['resourceTemplates' => []]),
            'logging/setLevel' => $this->successBody($id, []),
            default => $this->errorBody($id, -32601, "Method not found: {$method}"),
        };
    }

    /**
     * Echo the client's protocol version when we implement it; otherwise
     * answer with our newest. Clients compare this against what they sent.
     */
    protected function negotiateProtocolVersion(array $params): string
    {
        $requested = $params['protocolVersion'] ?? null;

        if (is_string($requested) && in_array($requested, self::SUPPORTED_PROTOCOL_VERSIONS, true)) {
            return $requested;
        }

        return self::SUPPORTED_PROTOCOL_VERSIONS[0];
    }

    protected function initializeResult(array $params = []): array
    {
        return [
            'protocolVersion' => $this->negotiateProtocolVersion($params),
            'capabilities' => ['tools' => ['listChanged' => false]],
            'serverInfo' => [
                'name' => $this->serverLabel(),
                'title' => config('app.name').' — '.$this->serverName(),
                'version' => '1.0.0',
            ],
            'instructions' => $this->instructions(),
        ];
    }

    /**
     * Free-text guidance surfaced to the model by clients that render it
     * (Claude and ChatGPT both do). Cheap way to make a 40-tool server
     * usable without the user having to explain it in every conversation.
     */
    protected function instructions(): string
    {
        return '';
    }

    protected function toolsList(): array
    {
        return array_map(
            fn (McpTool $tool) => [
                'name' => $tool->name(),
                'description' => $tool->description(),
                'inputSchema' => $tool->inputSchema(),
            ],
            $this->registry->all($this->serverName())
        );
    }

    protected function callTool(Request $request, mixed $id, array $params, mixed $context): array
    {
        $name = $params['name'] ?? null;
        $arguments = is_array($params['arguments'] ?? null) ? $params['arguments'] : [];

        if (! is_string($name) || $name === '') {
            return $this->errorBody($id, -32602, 'Invalid params: "name" is required.');
        }

        $tool = $this->registry->find($this->serverName(), $name);

        if (! $tool) {
            return $this->errorBody($id, -32602, "Unknown tool: {$name}");
        }

        $startedAt = microtime(true);
        $identity = $this->auditContext($context);

        if (! $this->authorizeTool($tool, $context)) {
            $message = "This token is missing the required ability: {$tool->requiredAbility()}";
            $this->audit($request, $name, $arguments, false, $message, $startedAt, $identity);

            return $this->toolResultBody(['success' => false, 'message' => $message], $id, true);
        }

        try {
            $result = $tool->handle($arguments, $context);
        } catch (\Throwable $e) {
            report($e);
            $this->audit($request, $name, $arguments, false, $e->getMessage(), $startedAt, $identity);

            return $this->toolResultBody(['success' => false, 'message' => $e->getMessage()], $id, true);
        }

        $success = (bool) ($result['success'] ?? true);
        $this->audit($request, $name, $arguments, $success, $success ? null : ($result['message'] ?? null), $startedAt, $identity);

        return $this->toolResultBody($result, $id, ! $success);
    }

    /**
     * CORS preflight. Browser-hosted clients (the MCP Inspector, the
     * ChatGPT and Grok web apps when they call from the page) send one
     * before the first POST and abort the connection if it fails.
     */
    public function preflight(): \Illuminate\Http\Response
    {
        return response('', 204);
    }

    /**
     * GET on a Streamable HTTP endpoint means "open a server->client
     * stream". This server never pushes unsolicited messages, so the
     * spec-correct answer is 405 with Allow — clients fall back to plain
     * POST request/response, which is what every tool call needs anyway.
     */
    public function stream(): \Illuminate\Http\Response
    {
        return response('', 405)->header('Allow', 'POST, OPTIONS');
    }

    /**
     * DELETE terminates a session. Sessions here are stateless (every POST
     * carries its own credential), so there is nothing to tear down.
     */
    public function terminate(): \Illuminate\Http\Response
    {
        return response('', 204);
    }

    private function audit(Request $request, string $toolName, array $arguments, bool $success, ?string $errorMessage, float $startedAt, array $identity): void
    {
        $this->auditLogger->log(
            $request,
            $this->serverName(),
            $toolName,
            $arguments,
            $success,
            $errorMessage,
            (int) round((microtime(true) - $startedAt) * 1000),
            $identity['admin_user_id'] ?? null,
            $identity['project_id'] ?? null,
            $identity['connector_token_id'] ?? null,
        );
    }

    protected function toolResultBody(array $payload, mixed $id, bool $isError): array
    {
        $text = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return $this->successBody($id, [
            'content' => [['type' => 'text', 'text' => $text === false ? '{"success":false,"message":"Result could not be encoded."}' : $text]],
            // structuredContent lets clients that support it read the result
            // without re-parsing the text block.
            'structuredContent' => $payload,
            'isError' => $isError,
        ]);
    }

    protected function successBody(mixed $id, array $result): array
    {
        return ['jsonrpc' => '2.0', 'id' => $id, 'result' => $result];
    }

    protected function errorBody(mixed $id, int $code, string $message): array
    {
        return ['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => $code, 'message' => $message]];
    }

    protected function success(mixed $id, array $result): JsonResponse
    {
        return response()->json($this->successBody($id, $result));
    }

    protected function error(mixed $id, int $code, string $message, int $status = 200): JsonResponse
    {
        return response()->json($this->errorBody($id, $code, $message), $status);
    }

    /**
     * A 401 carries WWW-Authenticate for two reasons: so a client can tell
     * "your token is wrong" apart from "this server is down", and so it can
     * find the OAuth metadata. resource_metadata is the pointer the whole
     * OAuth discovery chain hangs off — a connector that gets a 401 without
     * it has no way to learn this server can authenticate at all, and just
     * reports a failure.
     *
     * @see \App\Http\Controllers\Oauth\DiscoveryController
     */
    private function authError(McpAuthException $e, mixed $id): JsonResponse
    {
        return $this->error($id, $e->jsonRpcCode(), $e->getMessage(), 401)
            ->header('WWW-Authenticate', static::wwwAuthenticate($this->serverLabel()));
    }

    /**
     * @param  string  $realm  the server label, so a client's error message names which server refused it
     */
    public static function wwwAuthenticate(string $realm = 'webby-mcp'): string
    {
        $base = rtrim((string) (config('app.url') ?: url('/')), '/');

        return sprintf(
            'Bearer realm="%s", error="invalid_token", resource_metadata="%s/.well-known/oauth-protected-resource"',
            $realm,
            $base
        );
    }

    /**
     * Streamable HTTP lets the server assign a session id at initialize
     * time; clients echo it back on later requests. Ours is informational
     * (every request re-authenticates), but returning one keeps clients
     * that expect the header happy.
     */
    private function withSessionHeader(JsonResponse $response, Request $request): JsonResponse
    {
        return $response->header(
            'Mcp-Session-Id',
            $request->header('Mcp-Session-Id') ?: Str::uuid()->toString()
        );
    }
}
