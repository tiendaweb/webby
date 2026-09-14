<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\User;
use App\Services\AuditLogService;
use App\Services\Mcp\McpTool;
use Illuminate\Support\Facades\URL;

/**
 * High-risk tool: does NOT log the calling admin into the target user's
 * account directly — MCP tool calls are stateless (no shared browser
 * session with the admin who is chatting), so there is no session to
 * "become" the target user in. Instead it mints a short-lived, single-use
 * signed URL that performs the actual impersonation (App\Http\Controllers\
 * McpImpersonateController::consume, routes/web.php) when opened in a
 * browser — the same guardrails as the dashboard's
 * Admin\ImpersonateController::start() apply there (cannot impersonate an
 * admin or yourself), plus the link expires after 5 minutes.
 *
 * The audit log entry is written here, at generation time, not only on
 * consumption — a token with this ability can mint impersonation links
 * whether or not the human ever opens one, so the trail must start at the
 * MCP call itself.
 */
class AdminUsersImpersonateTool extends McpTool
{
    public function name(): string
    {
        return 'admin_users_impersonate';
    }

    public function description(): string
    {
        return 'Generate a short-lived (5 minute), single-use signed link that logs the admin\'s browser into the target client\'s account when opened. '
            .'Cannot target an admin user. This does not impersonate anything by itself — the returned URL must be opened by a human to take effect.';
    }

    public function requiredAbility(): ?string
    {
        return 'users:impersonate';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'user_id' => ['type' => 'integer', 'description' => 'The id of the client user to impersonate.'],
            ],
            'required' => ['user_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $userId = (int) ($arguments['user_id'] ?? 0);

        if ($userId <= 0) {
            return ['success' => false, 'message' => '"user_id" is required.'];
        }

        $target = User::find($userId);

        if (! $target) {
            return ['success' => false, 'message' => 'User not found.'];
        }

        if ($target->isAdmin()) {
            return ['success' => false, 'message' => 'Cannot impersonate admin users.'];
        }

        /** @var User $admin */
        $admin = $context;

        if ($target->id === $admin->id) {
            return ['success' => false, 'message' => 'Cannot impersonate yourself.'];
        }

        $expiresAt = now()->addMinutes(5);

        $url = URL::temporarySignedRoute('mcp.impersonate.consume', $expiresAt, [
            'user' => $target->id,
            'admin' => $admin->id,
        ]);

        AuditLogService::logAdminAction($target, $admin, 'impersonate_link_issued_via_mcp');

        return [
            'success' => true,
            'impersonation_url' => $url,
            'expires_at' => $expiresAt->toIso8601String(),
            'message' => 'Open this URL in a browser to log in as this client. It expires in 5 minutes and can be used once.',
        ];
    }
}
