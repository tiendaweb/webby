<?php

namespace App\Http\Middleware;

use App\Models\Project;
use App\Support\BaseDomainHelper;
use App\Support\SubdomainHelper;
use Closure;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken as Middleware;

class VerifyCsrfToken extends Middleware
{
    public function handle($request, Closure $next)
    {
        if ($this->isPublishedProjectRequest($request)) {
            return $next($request);
        }

        return parent::handle($request, $next);
    }

    private function isPublishedProjectRequest($request): bool
    {
        $host = strtolower($request->getHost());
        $baseDomain = BaseDomainHelper::match($host);

        if ($baseDomain && $host !== $baseDomain) {
            $subdomain = BaseDomainHelper::subdomain($host);

            if ($subdomain !== null && ! in_array($subdomain, SubdomainHelper::getAllBlockedSubdomains(), true)) {
                return Project::where('subdomain', $subdomain)
                    ->whereNotNull('published_at')
                    ->exists();
            }
        }

        if ($baseDomain) {
            return false;
        }

        return Project::where('custom_domain', $host)
            ->where('custom_domain_verified', true)
            ->whereNotNull('published_at')
            ->exists();
    }
}
