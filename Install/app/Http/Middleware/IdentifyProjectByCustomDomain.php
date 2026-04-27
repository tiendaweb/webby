<?php

namespace App\Http\Middleware;

use App\Http\Controllers\PublishedProjectController;
use App\Models\Project;
use App\Models\SystemSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IdentifyProjectByCustomDomain
{
    public function handle(Request $request, Closure $next): Response
    {
        // Check if custom domains are enabled globally
        if (! SystemSetting::get('domain_enable_custom_domains', false)) {
            return $next($request);
        }

        $host = strtolower($request->getHost());
        $baseDomain = SystemSetting::get('domain_base_domain');

        // Skip if host is the base domain or a subdomain of it
        if ($baseDomain) {
            $baseDomain = strtolower($baseDomain);

            // Skip if exact match with base domain
            if ($host === $baseDomain || $host === "www.{$baseDomain}") {
                return $next($request);
            }

            // Skip if it's a subdomain of the base domain
            if (str_ends_with($host, ".{$baseDomain}")) {
                return $next($request);
            }
        } else {
            // No base domain configured — fall back to APP_URL host to avoid
            // treating the application's own domain as a custom project domain.
            $appHost = strtolower(parse_url(config('app.url', ''), PHP_URL_HOST) ?? '');

            if ($appHost && ($host === $appHost || $host === "www.{$appHost}" || str_ends_with($host, ".{$appHost}"))) {
                return $next($request);
            }
        }

        // Skip common localhost variants and IP addresses
        if (in_array($host, ['localhost', '127.0.0.1', '::1']) || str_ends_with($host, '.localhost')) {
            return $next($request);
        }

        // Skip IP addresses — custom domains are always domain names
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return $next($request);
        }

        // Look up project by custom domain
        $project = Project::where('custom_domain', $host)
            ->where('custom_domain_verified', true)
            ->whereNotNull('published_at')
            ->first();

        if (! $project) {
            // No matching project found for this domain
            abort(404, 'Site not found');
        }

        // Check visibility
        if ($project->published_visibility === 'private') {
            $user = $request->user();

            if (! $user || $user->id !== $project->user_id) {
                abort(403, 'This site is private');
            }
        }

        $request->attributes->set('custom_domain_project', $project);

        $path = ltrim($request->getPathInfo(), '/') ?: 'index.html';

        return app(PublishedProjectController::class)->serve($request, $path);
    }
}
