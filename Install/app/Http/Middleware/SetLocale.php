<?php

namespace App\Http\Middleware;

use App\Models\Language;
use App\Models\SystemSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        try {
            $locale = $this->resolveLocale($request);

            // Validate locale exists and is active
            if (! Language::isValidCode($locale)) {
                $locale = SystemSetting::get('default_locale', 'en');
            }

            app()->setLocale($locale);
        } catch (\Exception $e) {
            // Database not available (fresh install), use default
            app()->setLocale('en');
        }

        return $next($request);
    }

    /**
     * Resolve the locale from user, session, or system default.
     */
    protected function resolveLocale(Request $request): string
    {
        // Priority 1: Authenticated user's preference
        if ($request->user() && $request->user()->locale) {
            return $request->user()->locale;
        }

        // Priority 2: Session (for guests)
        if ($request->session()->has('locale')) {
            return $request->session()->get('locale');
        }

        // Priority 3: System default
        return SystemSetting::get('default_locale', 'en');
    }
}
