<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(prepend: [
            \App\Http\Middleware\TrustProxies::class,
        ], append: [
            \App\Http\Middleware\IdentifyProjectBySubdomain::class,
            \App\Http\Middleware\IdentifyProjectByCustomDomain::class,
            \App\Http\Middleware\SetLocale::class, // Must run before HandleInertiaRequests to set locale for translations
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Traefik terminates TLS and forwards over http, setting
        // X-Forwarded-Proto. Without TrustProxies on the api group too,
        // url()/route() inside API responses emit http:// links — which
        // matters now that the MCP tools hand those URLs to an external
        // assistant.
        $middleware->api(prepend: [
            \App\Http\Middleware\TrustProxies::class,
        ]);

        $middleware->replaceInGroup(
            'web',
            \Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
            \App\Http\Middleware\VerifyCsrfToken::class
        );

        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureAdminAccess::class,
            'registration.enabled' => \App\Http\Middleware\CheckRegistrationEnabled::class,
            'verify.server.key' => \App\Http\Middleware\VerifyServerKey::class,
            'verify.project.token' => \App\Http\Middleware\VerifyProjectToken::class,
            'verify.connector.token' => \App\Http\Middleware\VerifyConnectorToken::class,
            'verify.mcp.url.token' => \App\Http\Middleware\VerifyMcpUrlToken::class,
            'mcp.cors' => \App\Http\Middleware\McpCors::class,
            'subdomain.project' => \App\Http\Middleware\IdentifyProjectBySubdomain::class,
            'custom.domain' => \App\Http\Middleware\IdentifyProjectByCustomDomain::class,
            'set.locale' => \App\Http\Middleware\SetLocale::class,
            'not-installed' => \App\Http\Middleware\NotInstalled::class,
            'installed' => \App\Http\Middleware\Installed::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // An unauthenticated MCP request must never be answered with a
        // redirect to /login: Laravel's Authenticate middleware redirects
        // whenever the caller did not say it wanted JSON, and an MCP client
        // that omits Accept then sees an HTML login page instead of a
        // credential error it can report to the user.
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            if (! $request->is('api/mcp/*')) {
                return null;
            }

            return response()->json([
                'jsonrpc' => '2.0',
                'id' => null,
                'error' => ['code' => -32001, 'message' => 'Authentication failed: the connector token is missing, expired or revoked.'],
            ], 401)->header('WWW-Authenticate', \App\Http\Controllers\Api\Mcp\McpController::wwwAuthenticate());
        });

        $exceptions->report(function (\Throwable $e) {
            app(\App\Services\SentryReporterService::class)->buffer($e);
        });
    })->create();
