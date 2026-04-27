<?php

namespace App\Http\Middleware;

use App\Models\SystemSetting;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class Installed
{
    /**
     * Handle an incoming request.
     *
     * Only allow access to application routes when the application IS installed.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->isInstalled()) {
            return redirect()->route('install');
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
            // Try to reload database config from .env and check again
            try {
                $this->reloadDatabaseConfig();

                return SystemSetting::get('installation_completed', false) === true;
            } catch (\Exception $e2) {
                // Database still not working, not installed
                return false;
            }
        }
    }

    /**
     * Reload database configuration from .env file
     */
    private function reloadDatabaseConfig(): void
    {
        $envPath = base_path('.env');
        if (! file_exists($envPath)) {
            return;
        }

        $envContent = file_get_contents($envPath);
        if ($envContent === false) {
            return;
        }

        // Parse DB_CONNECTION
        $dbConnection = 'mysql';
        if (preg_match('/^DB_CONNECTION=(.*)$/m', $envContent, $matches)) {
            $dbConnection = trim(trim($matches[1]), '"\'');
        }

        if ($dbConnection === 'sqlite') {
            if (preg_match('/^DB_DATABASE=(.*)$/m', $envContent, $matches)) {
                $dbPath = trim(trim($matches[1]), '"\'');
                config([
                    'database.default' => 'sqlite',
                    'database.connections.sqlite.database' => $dbPath,
                ]);
                DB::purge('sqlite');
            }
        } else {
            $dbConfig = [];
            $keys = ['DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USERNAME', 'DB_PASSWORD'];

            foreach ($keys as $key) {
                if (preg_match("/^{$key}=(.*)$/m", $envContent, $matches)) {
                    $value = trim(trim($matches[1]), '"\'');
                    $dbConfig[$key] = $value;
                }
            }

            config([
                'database.default' => 'mysql',
                'database.connections.mysql.host' => $dbConfig['DB_HOST'] ?? 'localhost',
                'database.connections.mysql.port' => $dbConfig['DB_PORT'] ?? '3306',
                'database.connections.mysql.database' => $dbConfig['DB_DATABASE'] ?? '',
                'database.connections.mysql.username' => $dbConfig['DB_USERNAME'] ?? '',
                'database.connections.mysql.password' => $dbConfig['DB_PASSWORD'] ?? '',
            ]);
            DB::purge('mysql');
        }
    }
}
