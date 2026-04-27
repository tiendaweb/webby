<?php

namespace App\Http\Middleware;

use App\Models\SystemSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class NotInstalled
{
    /**
     * Handle an incoming request.
     *
     * Only allow access to installer routes when the application is NOT installed.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Always allow access to the completed page (to show success message)
        if ($request->routeIs('install.completed')) {
            return $next($request);
        }

        if ($this->isInstalled()) {
            return redirect()->route('login');
        }

        return $next($request);
    }

    /**
     * Check if the application is installed
     */
    private function isInstalled(): bool
    {
        try {
            return SystemSetting::get('installation_completed', false) === true;
        } catch (\Exception $e) {
            // Database not configured yet, so not installed
            return false;
        }
    }
}
