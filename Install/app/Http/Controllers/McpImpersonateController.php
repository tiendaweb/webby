<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Consumes a signed link minted by
 * App\Services\Mcp\Tools\Admin\AdminUsersImpersonateTool. The route is
 * protected by Laravel's `signed` middleware (expiry + tamper-proofing),
 * which is why this controller can log the browser in without requiring
 * the admin to already have an authenticated session here — the signature
 * itself is the credential, valid once, for 5 minutes.
 */
class McpImpersonateController extends Controller
{
    public function consume(Request $request, string $user): RedirectResponse
    {
        $target = User::findOrFail($user);

        $adminId = $request->query('admin');
        $admin = $adminId ? User::find($adminId) : null;

        abort_unless($admin, 403, 'Invalid impersonation link.');
        abort_if($target->isAdmin(), 403, 'Cannot impersonate admin users.');
        abort_if($target->id === $admin->id, 403, 'Cannot impersonate yourself.');

        AuditLogService::logAdminAction($target, $admin, 'impersonate_start_via_mcp');

        Auth::loginUsingId($target->id);
        session(['impersonating_from' => $admin->id]);
        $request->session()->regenerate();

        return redirect()->route('projects.index');
    }
}
