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
        $middleware->web(append: [
            \App\Http\Middleware\IdentifyProjectBySubdomain::class,
            \App\Http\Middleware\IdentifyProjectByCustomDomain::class,
            \App\Http\Middleware\SetLocale::class, // Must run before HandleInertiaRequests to set locale for translations
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureAdminAccess::class,
            'registration.enabled' => \App\Http\Middleware\CheckRegistrationEnabled::class,
            'verify.server.key' => \App\Http\Middleware\VerifyServerKey::class,
            'verify.project.token' => \App\Http\Middleware\VerifyProjectToken::class,
            'subdomain.project' => \App\Http\Middleware\IdentifyProjectBySubdomain::class,
            'custom.domain' => \App\Http\Middleware\IdentifyProjectByCustomDomain::class,
            'set.locale' => \App\Http\Middleware\SetLocale::class,
            'not-installed' => \App\Http\Middleware\NotInstalled::class,
            'installed' => \App\Http\Middleware\Installed::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->report(function (\Throwable $e) {
            app(\App\Services\SentryReporterService::class)->buffer($e);
        });
    })->create();
