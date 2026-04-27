<?php

namespace App\Providers;

use App\Services\PluginManager;
use Illuminate\Support\ServiceProvider;

class PluginServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Register PluginManager as singleton
        $this->app->singleton(PluginManager::class, function ($app) {
            return new PluginManager;
        });

        // Also bind to 'plugins' for convenience
        $this->app->alias(PluginManager::class, 'plugins');
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Boot plugins after application is ready
        $this->app->make(PluginManager::class)->boot();

        // Register plugin routes
        $this->loadPluginRoutes();
    }

    /**
     * Load plugin-specific routes.
     */
    protected function loadPluginRoutes(): void
    {
        // Payment gateway webhook and callback routes
        \Route::prefix('payment-gateways')
            ->middleware('web')
            ->group(function () {
                \Route::post('{plugin}/webhook', [\App\Http\Controllers\PaymentGatewayController::class, 'webhook'])
                    ->name('payment-gateways.webhook')
                    ->withoutMiddleware(['web', \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class]);

                \Route::get('callback', [\App\Http\Controllers\PaymentGatewayController::class, 'callback'])
                    ->name('payment-gateways.callback');
            });
    }
}
