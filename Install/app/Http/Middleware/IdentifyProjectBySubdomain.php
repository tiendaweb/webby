<?php

namespace App\Http\Middleware;

use App\Http\Controllers\PublishedProjectController;
use App\Models\Project;
use App\Models\SystemSetting;
use App\Support\BaseDomainHelper;
use App\Support\SubdomainHelper;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IdentifyProjectBySubdomain
{
    public function handle(Request $request, Closure $next): Response
    {
        // Check if subdomains are enabled globally
        if (! SystemSetting::get('domain_enable_subdomains', false)) {
            return $next($request);
        }

        $host = strtolower($request->getHost());

        // Resolve which base domain this host belongs to (primary or alias),
        // so projects stay reachable on every domain the platform serves.
        $baseDomain = BaseDomainHelper::match($host);

        if (! $baseDomain || $host === $baseDomain) {
            return $next($request);
        }

        $subdomain = BaseDomainHelper::subdomain($host);

        if (empty($subdomain) || $subdomain === 'www') {
            return $next($request);
        }

        // If subdomain is reserved or admin-blocked, pass through to normal app routing
        // but redirect the landing page to the main domain (reserved subdomains are for app access only)
        if (in_array(strtolower($subdomain), SubdomainHelper::getAllBlockedSubdomains(), true)) {
            if ($request->getPathInfo() === '/') {
                $scheme = $request->getScheme();

                return redirect("{$scheme}://{$baseDomain}/");
            }

            return $next($request);
        }

        $project = Project::where('subdomain', $subdomain)
            ->whereNotNull('published_at')
            ->first();

        if (! $project) {
            abort(404, 'Project not found');
        }

        // Check visibility
        if ($project->published_visibility === 'private') {
            $user = $request->user();

            if (! $user || $user->id !== $project->user_id) {
                abort(403, 'This project is private');
            }
        }

        $request->attributes->set('subdomain_project', $project);

        // Serve the project directly — returning here avoids route conflicts
        // where paths like /login on a project subdomain would match app routes
        $path = ltrim($request->getPathInfo(), '/') ?: 'index.html';

        return app(PublishedProjectController::class)->serve($request, $path);
    }
}
