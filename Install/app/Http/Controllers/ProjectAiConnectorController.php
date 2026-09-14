<?php

namespace App\Http\Controllers;

use App\Models\AiConnectorModule;
use App\Models\Project;
use App\Models\ProjectAiConnectorActivation;
use App\Models\ProjectAiConnectorToken;
use App\Plugins\PaymentGateways\BankTransferPlugin;
use App\Services\PluginManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Client-facing management of the "Conector IA" (AI Connector) module for
 * one project: view status, activate/deactivate, and issue/revoke MCP
 * connector tokens (see App\Http\Middleware\VerifyConnectorToken,
 * App\Http\Controllers\Api\Mcp\McpProjectController).
 *
 * Deliberately separate from ProjectSettingsController's api_token
 * endpoints — that token is a different, lower-trust credential scoped to
 * generated-app file serving only.
 */
class ProjectAiConnectorController extends Controller
{
    public function __construct(private readonly PluginManager $pluginManager) {}

    /**
     * Canonical public origin, taken from APP_URL rather than the current
     * request: these URLs get pasted into a third-party product, so they
     * must not inherit a proxy-mangled scheme or host.
     */
    private function baseUrl(): string
    {
        $configured = trim((string) config('app.url'));

        return $configured !== '' ? rtrim($configured, '/') : rtrim(url('/'), '/');
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $module = AiConnectorModule::where('slug', AiConnectorModule::SLUG_AI_CONNECTOR)
            ->where('is_active', true)
            ->first();

        $activation = $module
            ? ProjectAiConnectorActivation::where('project_id', $project->id)
                ->where('ai_connector_module_id', $module->id)
                ->first()
            : null;

        return response()->json([
            'module' => $module ? [
                'id' => $module->id,
                'name' => $module->name,
                'description' => $module->description,
                'pricing_type' => $module->pricing_type,
                'price' => (float) $module->price,
            ] : null,
            'activation' => $activation ? [
                'id' => $activation->id,
                'status' => $activation->status,
                'is_active' => $activation->isActive(),
                'payment_method' => $activation->payment_method,
                'starts_at' => $activation->starts_at?->toIso8601String(),
                'renewal_at' => $activation->renewal_at?->toIso8601String(),
                'ends_at' => $activation->ends_at?->toIso8601String(),
                'requires_approval' => $activation->requiresApproval(),
            ] : null,
            'tokens' => $activation
                ? $activation->tokens()->whereNull('revoked_at')->get()->map(fn (ProjectAiConnectorToken $t) => [
                    'id' => $t->id,
                    'name' => $t->name,
                    'last_four' => $t->token_last_four,
                    'scopes' => $t->scopes,
                    'last_used_at' => $t->last_used_at?->toIso8601String(),
                    'expires_at' => $t->expires_at?->toIso8601String(),
                ])->values()
                : [],
            'mcp_endpoint' => $activation ? $this->baseUrl()."/api/mcp/project/{$project->id}" : null,
            // Same endpoint with the credential in the path — the only form
            // the Claude/ChatGPT/Grok connector directories can use, since
            // they accept a URL but no custom header.
            'mcp_endpoint_url_template' => $activation ? $this->baseUrl()."/api/mcp/project/{$project->id}/k/{TOKEN}" : null,
        ]);
    }

    public function activate(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $validated = $request->validate([
            'payment_method' => 'required|string|in:bank_transfer,paypal',
        ]);

        $module = AiConnectorModule::where('slug', AiConnectorModule::SLUG_AI_CONNECTOR)
            ->where('is_active', true)
            ->first();

        if (! $module) {
            return response()->json(['error' => 'The AI Connector module is not currently available.'], 404);
        }

        $existing = ProjectAiConnectorActivation::where('project_id', $project->id)
            ->where('ai_connector_module_id', $module->id)
            ->first();

        if ($existing && $existing->isActive()) {
            return response()->json(['error' => 'The AI Connector is already active for this project.'], 422);
        }

        if ($validated['payment_method'] === 'paypal') {
            return response()->json([
                'error' => 'PayPal checkout for the AI Connector module is not available yet. Please use bank transfer for now.',
            ], 422);
        }

        $gateway = $this->pluginManager->getGatewayBySlug('bank-transfer');

        if (! $gateway instanceof BankTransferPlugin) {
            return response()->json(['error' => 'Bank transfer is not configured on this platform.'], 422);
        }

        try {
            $result = $gateway->initItemPayment($module, $project, $request->user());
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        return response()->json(['success' => true, 'bankTransfer' => $result]);
    }

    public function deactivate(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $activation = ProjectAiConnectorActivation::where('project_id', $project->id)
            ->whereHas('module', fn ($q) => $q->where('slug', AiConnectorModule::SLUG_AI_CONNECTOR))
            ->first();

        if (! $activation) {
            return response()->json(['error' => 'The AI Connector has never been activated for this project.'], 404);
        }

        $activation->update(['status' => ProjectAiConnectorActivation::STATUS_CANCELLED, 'cancelled_at' => now()]);
        $activation->tokens()->whereNull('revoked_at')->update(['revoked_at' => now()]);

        return response()->json(['success' => true]);
    }

    public function storeToken(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $validated = $request->validate([
            'name' => 'required|string|max:120',
        ]);

        $activation = ProjectAiConnectorActivation::where('project_id', $project->id)
            ->whereHas('module', fn ($q) => $q->where('slug', AiConnectorModule::SLUG_AI_CONNECTOR))
            ->first();

        if (! $activation || ! $activation->isActive()) {
            return response()->json(['error' => 'The AI Connector is not active for this project.'], 422);
        }

        // Full read+write scope by default — this is the client's own project,
        // gated only by the module activation itself, not by sub-scopes.
        $scopes = [
            'files:read', 'files:write',
            'firebase:read', 'firebase:write',
            'settings:read', 'settings:write',
            'notes:read', 'notes:write',
            'publish:write',
        ];

        $issued = ProjectAiConnectorToken::issue($project, $activation, $validated['name'], $scopes, $request->user()->id);

        $endpoint = $this->baseUrl()."/api/mcp/project/{$project->id}";

        return response()->json([
            'success' => true,
            'token' => $issued['raw'],
            'endpoint' => $endpoint,
            // Paste-ready for a connector directory that only takes a URL.
            'connection_url' => $endpoint.'/k/'.rawurlencode($issued['raw']),
            'header' => 'Authorization: Bearer '.$issued['raw'],
            'message' => 'Copy this token now — it will not be shown again.',
        ]);
    }

    public function destroyToken(Request $request, Project $project, ProjectAiConnectorToken $token): JsonResponse
    {
        Gate::authorize('update', $project);

        if ($token->project_id !== $project->id) {
            abort(404);
        }

        $token->update(['revoked_at' => now()]);

        return response()->json(['success' => true]);
    }
}
