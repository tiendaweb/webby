<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ChecksDemoMode;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Admin UI for issuing/revoking the Sanctum personal access tokens that
 * authenticate the admin MCP connector (/api/mcp/admin). Replaces the
 * Phase-1 stopgap `php artisan mcp:issue-admin-token` command with a real
 * screen — same underlying mechanism (User::createToken()).
 *
 * A token issued here is equivalent to a superadmin session for whatever
 * abilities it's granted — none are pre-checked, and the UI must keep it
 * that way.
 */
class AdminApiTokenController extends Controller
{
    use ChecksDemoMode;

    /**
     * Every ability an admin connector token can carry. The order is the
     * order the Connect screen renders them in, grouped least- to
     * most-dangerous.
     */
    public const ABILITIES = [
        'users:read', 'users:write', 'users:impersonate',
        'projects:read', 'projects:write', 'projects:create', 'projects:publish', 'projects:delete',
        'files:read', 'files:write', 'files:delete',
        'database:read', 'database:rows', 'database:schema', 'database:execute', 'database:protected',
        // Each customer site's own Firebase/Firestore database.
        'firestore:read', 'firestore:write',
        'settings:read', 'settings:write',
        // Chat notes the site owner leaves for a connector to act on.
        'notes:read', 'notes:write',
        'plans:read', 'plans:write',
        'transactions:read', 'transactions:write',
        'subscriptions:read', 'subscriptions:write',
        'ai-providers:write',
        'connectors:manage',
    ];

    /**
     * Abilities that let a token destroy data or reach the platform's own
     * auth/billing tables. The UI marks these; nothing is pre-checked.
     */
    public const RISKY_ABILITIES = [
        'users:impersonate',
        'projects:delete',
        'files:delete',
        'database:schema',
        'database:execute',
        'database:protected',
        'firestore:write',
        'settings:write',
    ];

    public function index(Request $request)
    {
        $tokens = PersonalAccessToken::where('tokenable_type', User::class)
            ->whereIn('tokenable_id', User::where('role', 'admin')->pluck('id'))
            ->with('tokenable:id,name,email')
            ->latest()
            ->get()
            ->map(fn (PersonalAccessToken $token) => [
                'id' => $token->id,
                'name' => $token->name,
                'owner' => $token->tokenable ? ['id' => $token->tokenable->id, 'name' => $token->tokenable->name] : null,
                'abilities' => $token->abilities,
                'last_used_at' => $token->last_used_at?->toIso8601String(),
                'expires_at' => $token->expires_at?->toIso8601String(),
                'created_at' => $token->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Admin/ApiTokens/Index', [
            'tokens' => $tokens,
            'abilities' => self::ABILITIES,
            'riskyAbilities' => self::RISKY_ABILITIES,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return response()->json(['error' => 'Not available in demo mode.'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:120',
            'abilities' => 'required|array|min:1',
            'abilities.*' => 'in:'.implode(',', self::ABILITIES),
            'expires_at' => 'nullable|date|after:now',
        ]);

        /** @var User $admin */
        $admin = Auth::user();

        $expiresAt = $validated['expires_at'] ?? null;
        $token = $admin->createToken($validated['name'], $validated['abilities'], $expiresAt ? \Carbon\Carbon::parse($expiresAt) : null);

        return response()->json([
            'success' => true,
            'token' => $token->plainTextToken,
            'message' => 'Copy this token now — it will not be shown again.',
        ]);
    }

    public function destroy(Request $request, PersonalAccessToken $token): JsonResponse
    {
        if ($token->tokenable_type !== User::class) {
            abort(404);
        }

        $owner = $token->tokenable;

        if (! $owner || $owner->role !== 'admin') {
            abort(404);
        }

        $token->delete();

        return response()->json(['success' => true]);
    }
}
