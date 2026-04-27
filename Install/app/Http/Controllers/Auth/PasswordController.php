<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Traits\ChecksDemoMode;
use App\Models\SystemSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class PasswordController extends Controller
{
    use ChecksDemoMode;

    /**
     * Update the user's password.
     */
    public function update(Request $request): RedirectResponse
    {
        if ($redirect = $this->denyIfDemoAdmin()) {
            return $redirect;
        }

        if (session('impersonating_from')) {
            return back()->withErrors(['error' => 'This action is not allowed while impersonating a user.']);
        }

        $minLength = SystemSetting::get('password_min_length', 8);

        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::min($minLength), 'confirmed'],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        return back();
    }
}
