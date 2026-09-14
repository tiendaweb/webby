<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates the admin MCP server from a token carried *in the URL*
 * (/api/mcp/admin/k/{connector_token}) or in a ?token= query parameter,
 * instead of an Authorization header.
 *
 * Why this exists: the in-app connector directories of Claude, ChatGPT and
 * Grok let you paste a remote MCP **URL** but give you nowhere to type a
 * custom header. Without a URL-carried credential, those three products
 * simply cannot authenticate against this server, and the only usable
 * clients would be the CLI/desktop ones (which do send headers).
 *
 * The credential is the same Sanctum personal access token as the header
 * path — it is not a weaker one — so the URL itself must be treated as a
 * password: it is only ever shown once, on the Connect screen, and can be
 * revoked there.
 *
 * On failure this returns a JSON-RPC-shaped error body, because MCP clients
 * parse the body even for transport-level failures.
 */
class VerifyMcpUrlToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $raw = $request->route('connector_token')
            ?? $request->query('token')
            ?? $request->bearerToken();

        if (! is_string($raw) || $raw === '') {
            return $this->jsonRpcError($request, -32001, 'A connector token is required in the URL.', 401);
        }

        // Tokens travel through a path segment, so the Connect screen emits
        // them URL-encoded ("|" becomes "%7C"). Laravel already decodes the
        // segment, but a client that double-encodes is common enough to be
        // worth tolerating.
        if (! str_contains($raw, '|') && str_contains($raw, '%7C')) {
            $raw = urldecode($raw);
        }

        $token = PersonalAccessToken::findToken($raw);

        if (! $token) {
            return $this->jsonRpcError($request, -32001, 'Invalid connector token.', 401);
        }

        if ($token->expires_at && $token->expires_at->isPast()) {
            return $this->jsonRpcError($request, -32001, 'This connector token has expired.', 401);
        }

        $user = $token->tokenable;

        if (! $user instanceof User || ! $user->isAdmin()) {
            return $this->jsonRpcError($request, -32001, 'This token does not belong to an administrator.', 403);
        }

        // Throttle the last_used_at write to once a minute per token: a
        // single conversation can produce dozens of tool calls.
        $throttleKey = "mcp-url-token-touch:{$token->id}";
        if (! Cache::has($throttleKey)) {
            $token->forceFill(['last_used_at' => now()])->save();
            Cache::put($throttleKey, true, now()->addMinute());
        }

        $user->withAccessToken($token);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }

    private function jsonRpcError(Request $request, int $code, string $message, int $status): Response
    {
        $id = null;

        try {
            $id = $request->json('id');
        } catch (\Throwable) {
            // Non-JSON body (a browser opening the URL, for instance).
        }

        return response()->json([
            'jsonrpc' => '2.0',
            'id' => $id,
            'error' => ['code' => $code, 'message' => $message],
        ], $status)->header('WWW-Authenticate', \App\Http\Controllers\Api\Mcp\McpController::wwwAuthenticate());
    }
}
