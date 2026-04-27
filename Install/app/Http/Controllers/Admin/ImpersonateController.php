<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ChecksDemoMode;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ImpersonateController extends Controller
{
    use ChecksDemoMode;

    /**
     * Start impersonating a user.
     */
    public function start(Request $request, User $user): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        if ($user->isAdmin()) {
            return back()->withErrors(['error' => 'Cannot impersonate admin users.']);
        }

        if ($user->id === $request->user()->id) {
            return back()->withErrors(['error' => 'Cannot impersonate yourself.']);
        }

        if (session('impersonating_from')) {
            return back()->withErrors(['error' => 'Already impersonating a user.']);
        }

        $adminId = $request->user()->id;

        AuditLogService::logAdminAction($user, $request->user(), 'impersonate_start');

        Auth::loginUsingId($user->id);

        session(['impersonating_from' => $adminId]);

        $request->session()->regenerate();

        return redirect('/create');
    }

    /**
     * Stop impersonating and return to admin.
     */
    public function stop(Request $request): RedirectResponse
    {
        $adminId = session('impersonating_from');

        if (! $adminId) {
            return redirect()->back();
        }

        $admin = User::find($adminId);

        if (! $admin) {
            session()->forget('impersonating_from');
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect('/login');
        }

        AuditLogService::logAdminAction($request->user(), $admin, 'impersonate_stop');

        session()->forget('impersonating_from');

        Auth::loginUsingId($adminId);

        $request->session()->regenerate();

        return redirect('/admin/users');
    }
}
