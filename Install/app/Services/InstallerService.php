<?php

namespace App\Services;

use App\Models\Plan;
use App\Models\SystemSetting;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class InstallerService
{
    /**
     * PHP dependencies and their status
     */
    public array $dependencies;

    /**
     * File/directory permissions and their status
     */
    public array $permissions;

    public function __construct()
    {
        $this->checkDependencies();
        $this->checkPermissions();
    }

    /**
     * Check PHP version and required extensions
     */
    private function checkDependencies(): void
    {
        $this->dependencies = [
            'PHP 8.2+' => version_compare(PHP_VERSION, '8.2.0', '>='),
            'BCMath' => extension_loaded('bcmath'),
            'Ctype' => extension_loaded('ctype'),
            'cURL' => extension_loaded('curl'),
            'DOM' => extension_loaded('dom'),
            'Fileinfo' => extension_loaded('fileinfo'),
            'Filter' => extension_loaded('filter'),
            'GD' => extension_loaded('gd'),
            'Hash' => extension_loaded('hash'),
            'JSON' => extension_loaded('json'),
            'Mbstring' => extension_loaded('mbstring'),
            'OpenSSL' => extension_loaded('openssl'),
            'PCRE' => extension_loaded('pcre'),
            'PDO' => extension_loaded('pdo'),
            'PDO MySQL' => extension_loaded('pdo_mysql'),
            'PDO SQLite (Optional)' => extension_loaded('pdo_sqlite'),
            'Session' => extension_loaded('session'),
            'Tokenizer' => extension_loaded('tokenizer'),
            'XML' => extension_loaded('xml'),
            'Zip' => extension_loaded('zip'),
        ];

        // Check for critical disabled functions
        $disabledFunctions = array_map('trim', explode(',', ini_get('disable_functions')));
        $requiredFunctions = ['readlink', 'symlink', 'link', 'exec'];
        $blockedFunctions = array_intersect($requiredFunctions, $disabledFunctions);

        if (! empty($blockedFunctions)) {
            $this->dependencies['Required Functions ('.implode(', ', $blockedFunctions).') - DISABLED'] = false;
        } else {
            $this->dependencies['Required Functions (readlink, symlink, exec)'] = true;
        }
    }

    /**
     * Check file and directory permissions
     */
    private function checkPermissions(): void
    {
        $files = ['.env'];
        $directories = [
            'bootstrap/cache',
            'public',
            'storage',
            'storage/app',
            'storage/app/public',
            'storage/framework',
            'storage/framework/cache',
            'storage/framework/cache/data',
            'storage/framework/sessions',
            'storage/framework/views',
            'storage/logs',
        ];

        $this->permissions = [];

        foreach ($files as $file) {
            $path = base_path($file);
            $this->permissions[$file] = is_writable($path) && is_file($path);
        }

        foreach ($directories as $directory) {
            $path = base_path($directory);
            $this->permissions[$directory] = is_writable($path) && is_dir($path);
        }
    }

    /**
     * Test database connection with provided config
     */
    public function testDatabaseConnection(array $config): bool
    {
        $dbType = $config['db_type'] ?? 'mysql';

        try {
            DB::purge($dbType);

            if ($dbType === 'sqlite') {
                $dbPath = database_path('database.sqlite');
                $dbDir = dirname($dbPath);

                if (! is_dir($dbDir) || ! is_writable($dbDir)) {
                    return false;
                }

                if (! file_exists($dbPath)) {
                    if (! touch($dbPath)) {
                        return false;
                    }
                    chmod($dbPath, 0664);
                }

                config(['database.connections.sqlite.database' => $dbPath]);
                DB::connection('sqlite')->getPdo();

                return true;
            } else {
                config([
                    'database.connections.mysql.host' => $config['host'],
                    'database.connections.mysql.port' => $config['port'],
                    'database.connections.mysql.database' => $config['database'],
                    'database.connections.mysql.username' => $config['username'],
                    'database.connections.mysql.password' => $config['password'] ?? '',
                ]);
                DB::connection('mysql')->getPdo();

                return true;
            }
        } catch (Exception $e) {
            Log::error('Database connection test failed: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Create the .env configuration file
     */
    public function createConfig(array $data): void
    {
        $dbConnection = $data['db_type'] ?? 'mysql';

        $env = [
            'APP_NAME' => '"Webby"',
            'APP_ENV' => 'production',
            'APP_KEY' => 'base64:'.base64_encode(Str::random(32)),
            'APP_DEBUG' => 'false',
            'APP_TIMEZONE' => 'UTC',
            'APP_URL' => request()->getSchemeAndHttpHost(),

            'DB_CONNECTION' => $dbConnection,

            'SESSION_DRIVER' => 'file',
            'SESSION_LIFETIME' => '120',
            'QUEUE_CONNECTION' => 'sync',

            'CACHE_STORE' => 'file',
            'FILESYSTEM_DISK' => 'local',
        ];

        if ($dbConnection === 'sqlite') {
            $dbPath = database_path('database.sqlite');
            $env['DB_DATABASE'] = $dbPath;

            if (! file_exists($dbPath)) {
                if (! touch($dbPath)) {
                    throw new Exception('Failed to create SQLite database file.');
                }
                chmod($dbPath, 0664);
            }
        } else {
            $env['DB_HOST'] = $data['host'];
            $env['DB_PORT'] = $data['port'];
            $env['DB_DATABASE'] = $data['database'];
            $env['DB_USERNAME'] = $data['username'];
            $env['DB_PASSWORD'] = $data['password'] ?? '';
        }

        $envPath = base_path('.env');
        $result = file_put_contents($envPath, $this->toEnv($env));

        if ($result === false) {
            throw new Exception('Failed to write to .env file.');
        }

        Artisan::call('config:clear');
        DB::purge($dbConnection);
        $this->ensureStorageLink();
    }

    /**
     * Create admin user and complete installation
     */
    public function createAdmin(array $data): void
    {
        $this->reloadDatabaseConfig();

        // Run migrations
        Artisan::call('migrate', ['--force' => true]);

        // Run essential seeders
        $seeders = [
            'BuilderSeeder',
            'PlanSeeder',
            'SystemSettingSeeder',
            'LanguageSeeder',
            'PaymentGatewayPluginsSeeder',
            'LandingPageSeeder',
            'TemplateSeeder',
        ];

        foreach ($seeders as $seeder) {
            Artisan::call('db:seed', [
                '--class' => $seeder,
                '--force' => true,
            ]);
        }

        // Get default plan
        $plan = Plan::orderBy('price')->first();

        // Create admin user
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'admin',
            'plan_id' => $plan?->id,
        ]);

        // Set email_verified_at separately as it's not in fillable
        $user->email_verified_at = now();
        $user->save();

        // Set site name
        SystemSetting::set('site_name', $data['site_name'] ?? 'Webby', 'string', 'general');

        // Set optional purchase code for error reporting
        if (! empty($data['purchase_code'])) {
            SystemSetting::set('purchase_code', $data['purchase_code'], 'string', 'general');
            SystemSetting::set('sentry_enabled', true, 'boolean', 'general');
        }

        // Mark installation as complete
        SystemSetting::set('installation_completed', true, 'boolean', 'system');
    }

    /**
     * Get list of pending migrations
     */
    public function getPendingMigrations(): array
    {
        try {
            $migrator = app('migrator');
            $files = $migrator->getMigrationFiles(database_path('migrations'));

            foreach ($migrator->paths() as $path) {
                $files = array_merge($files, $migrator->getMigrationFiles($path));
            }

            $ran = $migrator->getRepository()->getRan();

            $allMigrationNames = array_map(
                fn ($file) => pathinfo($file, PATHINFO_FILENAME),
                array_keys($files)
            );

            return array_values(array_diff($allMigrationNames, $ran));
        } catch (Exception $e) {
            return [];
        }
    }

    /**
     * Ensure storage symlink exists
     */
    public function ensureStorageLink(): void
    {
        $storageLinkPath = public_path('storage');
        $targetPath = storage_path('app/public');

        if (is_link($storageLinkPath)) {
            $currentTarget = readlink($storageLinkPath);
            if ($currentTarget === $targetPath) {
                return;
            }
            @unlink($storageLinkPath);
        }

        Artisan::call('storage:link');
    }

    /**
     * Convert array to .env format
     */
    private function toEnv(array $data): string
    {
        $lines = [];
        $checkForSpecialChars = ['DB_PASSWORD'];

        foreach ($data as $key => $value) {
            if (is_bool($value)) {
                $value = $value ? 'true' : 'false';
            }

            if (is_null($value)) {
                $value = '';
            } elseif (! is_string($value)) {
                $value = (string) $value;
            }

            $hasSpecialChars = preg_match('/[!@$%^&*()+=\[\]{}|;:,.<>?#]/', $value);
            $needsQuotes = str_contains($value, ' ')
                || (in_array($key, $checkForSpecialChars) && $hasSpecialChars)
                || ($key !== 'DB_PASSWORD' && $hasSpecialChars);

            if ($needsQuotes && $value !== '') {
                $value = '"'.$value.'"';
            }

            $lines[] = "{$key}={$value}";
        }

        return implode("\n", $lines);
    }

    /**
     * Update a single value in .env file
     */
    private function updateEnvValue(string $key, string $value): void
    {
        $envPath = base_path('.env');
        $envContent = file_get_contents($envPath);

        if ($envContent === false) {
            return;
        }

        $pattern = "/^{$key}=.*/m";
        $replacement = "{$key}={$value}";

        if (preg_match($pattern, $envContent)) {
            $envContent = preg_replace($pattern, $replacement, $envContent);
        } else {
            $envContent .= "\n{$replacement}";
        }

        file_put_contents($envPath, $envContent);
    }

    /**
     * Reload database configuration from .env file
     */
    private function reloadDatabaseConfig(): void
    {
        $envPath = base_path('.env');
        $envContent = file_get_contents($envPath);

        if ($envContent === false) {
            return;
        }

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
