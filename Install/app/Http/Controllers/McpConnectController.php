<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Admin\AdminApiTokenController;
use App\Http\Traits\ChecksDemoMode;
use App\Models\McpToolCall;
use App\Models\OAuthClient;
use App\Models\OAuthRefreshToken;
use App\Models\Project;
use App\Models\ProjectAiConnectorActivation;
use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Mcp\McpToolRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * "Connect" — the standalone screen for wiring this installation into
 * Claude, ChatGPT or Grok as an MCP connector.
 *
 * It is deliberately NOT under /admin: connecting an assistant is the thing
 * the operator does first and returns to, not a settings sub-page, and
 * burying it three levels down was the actual complaint this screen answers.
 * The underlying credential is the same Sanctum personal access token the
 * /admin/api-tokens screen issues — this one just issues it in a single
 * click with the full ability set, and hands back every paste-ready form of
 * the connection (URL, CLI command, desktop JSON) instead of a bare string.
 *
 * @see \App\Http\Controllers\Api\Mcp\McpAdminController
 * @see \App\Http\Middleware\VerifyMcpUrlToken
 */
class McpConnectController extends Controller
{
    use ChecksDemoMode;

    private const TOKEN_NAME_PREFIX = 'Connector';

    public function index(Request $request, McpToolRegistry $registry): Response
    {
        /** @var User $admin */
        $admin = Auth::user();

        $adminIds = User::where('role', 'admin')->pluck('id');

        $tokens = PersonalAccessToken::where('tokenable_type', User::class)
            ->whereIn('tokenable_id', $adminIds)
            ->with('tokenable:id,name,email')
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn (PersonalAccessToken $token) => [
                'id' => $token->id,
                'name' => $token->name,
                'owner' => $token->tokenable?->name,
                'abilities' => $token->abilities,
                'ability_count' => count((array) $token->abilities),
                'last_used_at' => $token->last_used_at?->toIso8601String(),
                'expires_at' => $token->expires_at?->toIso8601String(),
                'created_at' => $token->created_at?->toIso8601String(),
                'is_expired' => $token->expires_at !== null && $token->expires_at->isPast(),
            ]);

        $calls = McpToolCall::query()
            ->latest('id')
            ->limit(25)
            ->get()
            ->map(fn (McpToolCall $call) => [
                'id' => $call->id,
                'server' => $call->server,
                'tool_name' => $call->tool_name,
                'success' => (bool) $call->success,
                'error_message' => $call->error_message,
                'project_id' => $call->project_id,
                'duration_ms' => $call->duration_ms,
                'created_at' => $call->created_at?->toIso8601String(),
            ]);

        // Client-side connectors: the sites whose owners activated the AI
        // Connector module, so the operator can see the whole picture from
        // one screen instead of opening each project.
        $projectConnectors = ProjectAiConnectorActivation::query()
            ->with(['project:id,name,subdomain,user_id'])
            ->latest('id')
            ->limit(25)
            ->get()
            ->filter(fn (ProjectAiConnectorActivation $a) => $a->project !== null)
            ->map(fn (ProjectAiConnectorActivation $a) => [
                'id' => $a->id,
                'status' => $a->status,
                'is_active' => $a->isActive(),
                'project_id' => $a->project->id,
                'project_name' => $a->project->name,
                'endpoint' => $this->baseUrl()."/api/mcp/project/{$a->project->id}",
                'settings_url' => $this->baseUrl()."/project/{$a->project->id}/settings",
                'ends_at' => $a->ends_at?->toIso8601String(),
            ])
            ->values();

        // Apps that enrolled themselves through OAuth. Until now these were
        // invisible: they register without a human, so the only trace was a
        // row in the database. An operator needs to be able to see what is
        // connected and cut it off.
        $liveByClient = OAuthRefreshToken::query()
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->selectRaw('client_id, count(*) as total, max(updated_at) as last_seen')
            ->groupBy('client_id')
            ->get()
            ->keyBy('client_id');

        $oauthClients = OAuthClient::query()
            ->latest()
            ->limit(50)
            ->get()
            ->map(function (OAuthClient $client) use ($liveByClient) {
                $live = $liveByClient->get($client->id);

                return [
                    'id' => $client->id,
                    'name' => $client->name,
                    'client_uri' => $client->client_uri,
                    'redirect_hosts' => array_values(array_unique(array_filter(array_map(
                        fn (string $uri) => parse_url($uri, PHP_URL_HOST),
                        (array) $client->redirect_uris
                    )))),
                    'created_at' => $client->created_at?->toIso8601String(),
                    'last_used_at' => $client->last_used_at?->toIso8601String(),
                    'active_connections' => (int) ($live->total ?? 0),
                ];
            });

        return Inertia::render('Connect/Index', [
            'oauthClients' => $oauthClients,
            'endpoints' => $this->endpoints(),
            'tokens' => $tokens,
            'abilities' => AdminApiTokenController::ABILITIES,
            'riskyAbilities' => AdminApiTokenController::RISKY_ABILITIES,
            'toolCount' => count($registry->all('admin')),
            'projectToolCount' => count($registry->all('project')),
            'tools' => array_map(fn ($tool) => [
                'name' => $tool->name(),
                'description' => $tool->description(),
                'requires' => $tool->requiredAbility(),
            ], $registry->all('admin')),
            'recentCalls' => $calls,
            'projectConnectors' => $projectConnectors,
            'platform' => [
                'name' => SystemSetting::get('site_name', config('app.name')),
                'url' => rtrim((string) config('app.url'), '/'),
                'base_domain' => SystemSetting::get('domain_base_domain', config('app.base_domain')),
                'project_count' => Project::count(),
            ],
            'currentAdmin' => ['id' => $admin->id, 'name' => $admin->name, 'email' => $admin->email],
        ]);
    }

    /**
     * Issue a connector token and hand back every paste-ready form of it.
     * The raw token is returned exactly once — it is hashed at rest and
     * cannot be recovered afterwards, only revoked and reissued.
     */
    public function store(Request $request): JsonResponse
    {
        if ($this->denyIfDemo()) {
            return response()->json(['error' => 'Not available in demo mode.'], 403);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:120',
            'abilities' => 'nullable|array',
            'abilities.*' => 'in:'.implode(',', AdminApiTokenController::ABILITIES),
            'expires_in_days' => 'nullable|integer|min:1|max:3650',
            'client' => 'nullable|string|max:40',
        ]);

        /** @var User $admin */
        $admin = Auth::user();

        // No selection means "everything": the one-click path exists so the
        // operator does not have to reason about 27 checkboxes to get going.
        $abilities = $validated['abilities'] ?? AdminApiTokenController::ABILITIES;

        if ($abilities === []) {
            $abilities = AdminApiTokenController::ABILITIES;
        }

        $client = $validated['client'] ?? 'generic';
        $name = $validated['name'] ?: self::TOKEN_NAME_PREFIX.' · '.ucfirst($client).' · '.now()->format('Y-m-d H:i');

        $expiresAt = isset($validated['expires_in_days'])
            ? now()->addDays((int) $validated['expires_in_days'])
            : null;

        $newToken = $admin->createToken($name, $abilities, $expiresAt);
        $plain = $newToken->plainTextToken;

        return response()->json([
            'success' => true,
            'token' => $plain,
            'token_id' => $newToken->accessToken->getKey(),
            'name' => $name,
            'abilities' => $abilities,
            'expires_at' => $expiresAt?->toIso8601String(),
            'connection' => $this->connectionForms($plain),
            'message' => 'Copy this now — the token is stored hashed and will never be shown again.',
        ]);
    }

    public function destroy(Request $request, string $token): JsonResponse
    {
        if ($this->denyIfDemo()) {
            return response()->json(['error' => 'Not available in demo mode.'], 403);
        }

        $model = PersonalAccessToken::find($token);

        if (! $model || $model->tokenable_type !== User::class) {
            abort(404);
        }

        $owner = $model->tokenable;

        if (! $owner || $owner->role !== 'admin') {
            abort(404);
        }

        $model->delete();

        return response()->json(['success' => true]);
    }

    /**
     * The canonical public origin of this installation.
     *
     * Built from APP_URL rather than url()/the current request: these
     * strings are copied into a third-party product's configuration, so
     * they have to be right even if a proxy header is missing and the
     * request looks like plain http from inside the container.
     */
    private function baseUrl(): string
    {
        $configured = trim((string) config('app.url'));

        return $configured !== '' ? rtrim($configured, '/') : rtrim(url('/'), '/');
    }

    /**
     * Cut an OAuth app off entirely: its live refresh tokens, the access
     * tokens they back, and the registration itself. The app can enrol
     * again — registration is open — but it lands back at the consent
     * screen with nothing granted.
     */
    public function destroyOauthClient(Request $request, string $client): JsonResponse
    {
        if ($this->denyIfDemo()) {
            return response()->json(['error' => 'Not available in demo mode.'], 403);
        }

        $model = OAuthClient::find($client);

        if (! $model) {
            abort(404);
        }

        $tokens = OAuthRefreshToken::where('client_id', $model->id)->get();

        foreach ($tokens as $token) {
            if ($token->access_token_id !== null) {
                PersonalAccessToken::where('id', $token->access_token_id)->delete();
            }
        }

        OAuthRefreshToken::where('client_id', $model->id)->delete();
        $model->delete();

        return response()->json(['success' => true]);
    }

    /**
     * @return array<string, string>
     */
    private function endpoints(): array
    {
        $base = $this->baseUrl();

        return [
            'admin' => $base.'/api/mcp/admin',
            'admin_url_token_template' => $base.'/api/mcp/admin/k/{TOKEN}',
            'project_template' => $base.'/api/mcp/project/{PROJECT_ID}',
            'project_url_token_template' => $base.'/api/mcp/project/{PROJECT_ID}/k/{TOKEN}',
        ];
    }

    /**
     * Every shape of the same connection, so the screen never asks the
     * operator to assemble a URL or a JSON blob by hand.
     */
    private function connectionForms(string $plainToken): array
    {
        $base = $this->baseUrl().'/api/mcp/admin';
        $urlForm = $base.'/k/'.rawurlencode($plainToken);
        $server = 'webby';

        return [
            'endpoint' => $base,
            'url_with_token' => $urlForm,
            'header' => 'Authorization: Bearer '.$plainToken,
            'claude_code' => sprintf(
                'claude mcp add --transport http %s %s --header "Authorization: Bearer %s"',
                $server,
                $base,
                $plainToken
            ),
            'claude_desktop_json' => json_encode([
                'mcpServers' => [
                    $server => [
                        'command' => 'npx',
                        'args' => ['-y', 'mcp-remote', $base, '--header', 'Authorization: Bearer '.$plainToken],
                    ],
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            'vscode_json' => json_encode([
                'servers' => [
                    $server => [
                        'type' => 'http',
                        'url' => $base,
                        'headers' => ['Authorization' => 'Bearer '.$plainToken],
                    ],
                ],
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
            'curl' => sprintf(
                'curl -sS %s -H "Authorization: Bearer %s" -H "Content-Type: application/json" '
                ."-d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'",
                $base,
                $plainToken
            ),
        ];
    }
}
