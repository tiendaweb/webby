<?php

namespace App\Http\Middleware;

use App\Models\Project;
use App\Models\ProjectAiConnectorToken;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates the client-side AI Connector (MCP) against
 * project_ai_connector_tokens, scoped to exactly one project.
 *
 * Deliberately NOT the same mechanism as VerifyProjectToken (which guards
 * only the generated-app file API on projects.api_token) — this token grants
 * full project read/write via MCP and is a distinct, hashed credential, so a
 * leaked generated-app token can never be used here and vice versa.
 *
 * On success, stashes 'project' and 'connector_token' request attributes for
 * the controller. On failure, returns a JSON-RPC-shaped error body (rather
 * than a bare 401) since MCP clients expect that envelope even for
 * transport-level authentication failures.
 */
class VerifyConnectorToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $projectId = $request->route('project');

        if (! $projectId) {
            return $this->jsonRpcError($request, -32602, 'Project id is required.', 400);
        }

        $project = Project::find($projectId);

        if (! $project) {
            return $this->jsonRpcError($request, -32602, 'Project not found.', 404);
        }

        // The URL-carried form (/api/mcp/project/{project}/k/{token}) and
        // ?token= exist for Claude/ChatGPT/Grok connector directories, which
        // accept a remote MCP URL but offer no field for a custom header.
        $raw = $request->route('connector_token')
            ?? $request->header('X-Connector-Token')
            ?? $request->bearerToken()
            ?? $request->query('token')
            ?? $request->input('connector_token');

        if (! $raw) {
            return $this->jsonRpcError($request, -32001, 'A connector token is required.', 401);
        }

        $token = ProjectAiConnectorToken::where('project_id', $project->id)
            ->where('token_hash', hash('sha256', $raw))
            ->first();

        if (! $token) {
            return $this->jsonRpcError($request, -32001, 'Invalid connector token.', 401);
        }

        if ($token->isRevoked()) {
            return $this->jsonRpcError($request, -32001, 'This connector token has been revoked.', 401);
        }

        if ($token->isExpired()) {
            return $this->jsonRpcError($request, -32001, 'This connector token has expired.', 401);
        }

        $activation = $token->activation;

        if (! $activation || ! $activation->isActive()) {
            return $this->jsonRpcError(
                $request,
                -32001,
                'The AI Connector module is not active for this project.',
                403
            );
        }

        // Throttle the last_used_at write to once/minute per token to avoid a DB write per tool call.
        $throttleKey = "connector-token-touch:{$token->id}";
        if (! Cache::has($throttleKey)) {
            $token->forceFill(['last_used_at' => now()])->saveQuietly();
            Cache::put($throttleKey, true, now()->addMinute());
        }

        $request->attributes->set('project', $project);
        $request->attributes->set('connector_token', $token);

        return $next($request);
    }

    private function jsonRpcError(Request $request, int $code, string $message, int $status): Response
    {
        $id = $request->json('id');

        return response()->json([
            'jsonrpc' => '2.0',
            'id' => $id,
            'error' => ['code' => $code, 'message' => $message],
        ], $status);
    }
}
