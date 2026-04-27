<?php

namespace App\Http\Middleware;

use App\Services\InstallerService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

class InstallationGuard
{
    /**
     * Handle an incoming request.
     *
     * Ensure installation steps are completed in order.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $installer = new InstallerService;
        $currentRoute = Route::currentRouteName();

        // Map .store routes to their parent step
        $routeMap = [
            'install.database.store' => 'install.database',
            'install.admin.store' => 'install.admin',
        ];
        $effectiveRoute = $routeMap[$currentRoute] ?? $currentRoute;

        $checks = [
            'install.requirements' => function () use ($installer) {
                // Check if all required dependencies are met (skip optional ones)
                foreach ($installer->dependencies as $name => $status) {
                    if (str_contains($name, '(Optional)')) {
                        continue;
                    }
                    if ($status === false) {
                        return false;
                    }
                }

                return true;
            },
            'install.permissions' => function () use ($installer) {
                // Check if all file/directory permissions are correct
                return ! in_array(false, $installer->permissions, true);
            },
            'install.database' => function () {
                // Check if database connection works
                try {
                    DB::connection()->getPdo();

                    return true;
                } catch (\Exception $e) {
                    return false;
                }
            },
            'install.admin' => function () {
                // Check if migrations ran (users table exists)
                try {
                    return Schema::hasTable('users');
                } catch (\Exception $e) {
                    return false;
                }
            },
        ];

        // Validate all previous steps before allowing current step
        foreach ($checks as $route => $check) {
            if ($route !== $effectiveRoute) {
                if ($check()) {
                    continue;
                }

                // Redirect to first failed step
                return redirect()->route($route)
                    ->with('error', 'Please complete this step first.');
            }

            break;
        }

        return $next($request);
    }
}
