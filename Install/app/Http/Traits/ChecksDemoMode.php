<?php

namespace App\Http\Traits;

use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;

trait ChecksDemoMode
{
    protected function denyIfDemo(): ?RedirectResponse
    {
        if (config('app.demo')) {
            return back()->withErrors(['error' => 'This action is disabled in demo mode.']);
        }

        return null;
    }

    protected function denyIfDemoAdmin(): ?RedirectResponse
    {
        if (config('app.demo') && Auth::id() === 1) {
            return back()->withErrors(['error' => 'The demo admin account cannot be modified.']);
        }

        return null;
    }
}
