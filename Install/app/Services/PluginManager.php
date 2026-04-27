<?php

namespace App\Services;

use App\Contracts\PaymentGatewayPlugin;
use App\Contracts\Plugin as PluginContract;
use App\Models\Plugin;
use App\Models\Subscription;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use ZipArchive;

class PluginManager
{
    /**
     * Discover all available plugins from the filesystem.
     */
    public function discover(): Collection
    {
        $plugins = collect();

        $pluginTypes = [
            'PaymentGateways' => 'payment_gateway',
        ];

        foreach ($pluginTypes as $directory => $type) {
            $path = app_path("Plugins/{$directory}");

            if (! File::exists($path)) {
                continue;
            }

            // Scan plugin directories
            $pluginDirs = File::directories($path);

            foreach ($pluginDirs as $pluginDir) {
                $manifestPath = $pluginDir.'/plugin.json';

                if (! File::exists($manifestPath)) {
                    continue;
                }

                $manifest = json_decode(File::get($manifestPath), true);
                if (! $manifest) {
                    continue;
                }

                $plugins->push([
                    'slug' => $manifest['slug'],
                    'name' => $manifest['name'],
                    'description' => $manifest['description'],
                    'type' => $manifest['type'],
                    'version' => $manifest['version'],
                    'author' => $manifest['author'],
                    'namespace' => $manifest['namespace'],
                    'icon' => $manifest['icon'] ?? null,
                    'path' => $pluginDir,
                ]);
            }
        }

        return $plugins;
    }

    /**
     * Boot all installed plugins.
     * Should be called from PluginServiceProvider.
     */
    public function boot(): void
    {
        try {
            if (! Schema::hasTable('plugins')) {
                return;
            }

            // Register migrations from all plugin directories
            $this->registerMigrationsFromFilesystem();
        } catch (\Exception $e) {
            // Database not accessible yet
            return;
        }
    }

    /**
     * Register all plugin migrations by scanning the filesystem.
     */
    public function registerMigrationsFromFilesystem(): void
    {
        $pluginTypes = ['PaymentGateways'];

        foreach ($pluginTypes as $typeDirectory) {
            $basePath = app_path("Plugins/{$typeDirectory}");

            if (! File::exists($basePath)) {
                continue;
            }

            $pluginDirs = File::directories($basePath);

            foreach ($pluginDirs as $pluginDir) {
                $migrationsPath = $pluginDir.'/database/migrations';

                if (File::exists($migrationsPath)) {
                    app('migrator')->path($migrationsPath);
                }
            }
        }
    }

    /**
     * Install a plugin from its slug.
     */
    public function install(string $slug): Plugin
    {
        $discovered = $this->discover()->firstWhere('slug', $slug);

        if (! $discovered) {
            throw new \Exception("Plugin {$slug} not found");
        }

        $className = $discovered['namespace'];

        if (! class_exists($className)) {
            throw new \Exception("Plugin class {$className} not found");
        }

        $instance = new $className;

        return Plugin::create([
            'name' => $instance->getName(),
            'slug' => Str::slug($instance->getName()),
            'type' => $instance->getType(),
            'class' => $className,
            'version' => $instance->getVersion(),
            'status' => 'inactive',
            'installed_at' => now(),
        ]);
    }

    /**
     * Install a plugin from a ZIP file.
     *
     * @throws \Exception
     */
    public function installFromZip(UploadedFile $zipFile): Plugin
    {
        $zip = new ZipArchive;
        $tempDir = storage_path('app/temp_plugin_'.uniqid());
        $targetDir = null;
        $migratedFiles = [];

        try {
            // 1. Extract ZIP
            if ($zip->open($zipFile->getRealPath()) !== true) {
                throw new \Exception('Failed to open ZIP file');
            }

            // Validate ZIP entries for path traversal
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (str_contains($name, '..') || str_starts_with($name, '/')) {
                    $zip->close();
                    throw new \Exception("Invalid file path in ZIP archive: {$name}");
                }
            }

            File::makeDirectory($tempDir, 0755, true);
            $zip->extractTo($tempDir);
            $zip->close();

            // Check if contents are wrapped in a single subdirectory
            $contents = File::directories($tempDir);
            $workDir = $tempDir;
            if (count($contents) === 1 && File::isDirectory($contents[0])
                && File::exists($contents[0].'/plugin.json')) {
                $workDir = $contents[0];
            }

            // 2. Validate plugin.json
            $manifestPath = $workDir.'/plugin.json';
            if (! File::exists($manifestPath)) {
                throw new \Exception('plugin.json not found in ZIP file');
            }
            $manifest = json_decode(File::get($manifestPath), true);
            if (! $manifest) {
                throw new \Exception('Invalid plugin.json format');
            }
            $this->validateManifest($manifest);

            // 3. Validate requirements
            if (isset($manifest['requirements'])) {
                $this->validateRequirements($manifest['requirements']);
            }

            // 4. Check for duplicate
            if ($this->isInstalled($manifest['slug'])) {
                throw new \Exception("Plugin '{$manifest['name']}' is already installed");
            }

            // 5. Validate main class file
            $mainClassPath = $workDir.'/'.$manifest['main_class'];
            if (! File::exists($mainClassPath)) {
                throw new \Exception("Main class file not found: {$manifest['main_class']}");
            }

            // 6. Determine target directory (PascalCase for PSR-4 compatibility)
            $typeDir = $this->getTypeDirectory($manifest['type']);
            $targetDir = app_path("Plugins/{$typeDir}/".Str::studly($manifest['slug']));

            // 7. Copy plugin files
            if (File::exists($targetDir)) {
                File::deleteDirectory($targetDir);
            }
            File::copyDirectory($workDir, $targetDir);

            // 8. Process migrations
            if (! empty($manifest['migrations'])) {
                $migratedFiles = $this->processMigrations($targetDir, $manifest['migrations']);
            }

            // 9. Load and validate class
            require_once $targetDir.'/'.$manifest['main_class'];
            $className = $manifest['namespace'];
            if (! class_exists($className)) {
                throw new \Exception("Plugin class {$className} not found");
            }
            $instance = new $className;
            if (! $instance instanceof PluginContract) {
                throw new \Exception('Plugin must implement Plugin interface');
            }

            // 10. Create database record
            $manifest['uploaded'] = true;
            $plugin = Plugin::create([
                'name' => $manifest['name'],
                'slug' => $manifest['slug'],
                'type' => $manifest['type'],
                'class' => $className,
                'version' => $manifest['version'],
                'status' => 'inactive',
                'metadata' => $manifest,
                'migrations' => $migratedFiles ?: null,
                'installed_at' => now(),
            ]);

            return $plugin;
        } catch (\Exception $e) {
            // Cleanup on failure
            if ($targetDir && File::exists($targetDir)) {
                File::deleteDirectory($targetDir);
            }
            foreach ($migratedFiles as $file) {
                $path = database_path("migrations/{$file}");
                if (File::exists($path)) {
                    File::delete($path);
                }
            }
            throw $e;
        } finally {
            if (File::exists($tempDir)) {
                File::deleteDirectory($tempDir);
            }
        }
    }

    /**
     * Uninstall a plugin.
     *
     * @throws \Exception
     */
    public function uninstall(Plugin $plugin): void
    {
        // Check if core plugin
        if ($plugin->isCorePlugin()) {
            throw new \Exception("Cannot uninstall core plugin: {$plugin->name}. This plugin is required for the system to function.");
        }

        // Check active subscriptions using all possible payment_method identifiers
        // Covers: display name, slug, snake_case slug, and known Subscription constants
        $paymentMethodValues = array_unique(array_filter([
            $plugin->name,
            $plugin->slug,
            str_replace('-', '_', $plugin->slug),
            Subscription::getPaymentMethodConstant($plugin->slug),
        ]));

        $activeSubscriptions = Subscription::whereIn('payment_method', $paymentMethodValues)
            ->whereIn('status', [Subscription::STATUS_ACTIVE, Subscription::STATUS_PENDING])
            ->count();

        if ($activeSubscriptions > 0) {
            throw new \Exception("Cannot uninstall {$plugin->name}. There are {$activeSubscriptions} active or pending subscriptions using this payment method.");
        }

        // Handle uploaded plugins: rollback migrations and delete files
        if ($plugin->isUploaded()) {
            // Rollback migrations in reverse order
            if ($plugin->hasMigrations()) {
                foreach (array_reverse($plugin->getMigrations()) as $file) {
                    $path = database_path("migrations/{$file}");
                    if (File::exists($path)) {
                        try {
                            Artisan::call('migrate:rollback', [
                                '--path' => "database/migrations/{$file}",
                                '--force' => true,
                            ]);
                        } catch (\Exception $e) {
                            // Log but continue - migration might already be rolled back
                            \Log::warning("Failed to rollback migration {$file}: ".$e->getMessage());
                        }
                        File::delete($path);
                    }
                }
            }

            // Delete plugin directory (check both slug and PascalCase variants)
            $typeDir = $this->getTypeDirectory($plugin->type);
            $pluginDir = $this->findPluginDirectory($typeDir, $plugin->slug);
            if ($pluginDir && File::exists($pluginDir)) {
                File::deleteDirectory($pluginDir);
            }
        }

        $plugin->delete();
    }

    /**
     * Configure a plugin with the provided configuration.
     */
    public function configure(Plugin $plugin, array $config): void
    {
        $instance = $plugin->getInstance();

        // Validate configuration
        $instance->validateConfig($config);

        $plugin->update([
            'config' => $config,
        ]);
    }

    /**
     * Get all active payment gateway plugins.
     */
    public function getActiveGateways(): Collection
    {
        return Plugin::active()
            ->byType('payment_gateway')
            ->get()
            ->map(fn ($plugin) => $plugin->getInstance());
    }

    /**
     * Get active gateways that support a specific currency.
     */
    public function getActiveGatewaysForCurrency(?string $currency = null): Collection
    {
        $currency = $currency ?? \App\Helpers\CurrencyHelper::getCode();

        return $this->getActiveGateways()
            ->filter(function ($gateway) use ($currency) {
                $supported = $gateway->getSupportedCurrencies();

                // Empty array means all currencies supported
                return empty($supported) || in_array($currency, $supported);
            });
    }

    /**
     * Get a specific payment gateway plugin instance by name.
     */
    public function getGateway(string $name): ?PaymentGatewayPlugin
    {
        $plugin = Plugin::active()
            ->byType('payment_gateway')
            ->where('name', $name)
            ->first();

        return $plugin ? $plugin->getInstance() : null;
    }

    /**
     * Get a specific payment gateway plugin instance by slug.
     */
    public function getGatewayBySlug(string $slug): ?PaymentGatewayPlugin
    {
        $plugin = Plugin::active()
            ->byType('payment_gateway')
            ->where('slug', $slug)
            ->first();

        return $plugin ? $plugin->getInstance() : null;
    }

    /**
     * Get all plugins with their data for admin UI.
     * Returns array suitable for Inertia props.
     * Core plugins are shown first.
     */
    public function getPluginsForAdmin(): array
    {
        $installed = Plugin::all()->keyBy('slug');

        return $this->discover()->map(function ($discovered) use ($installed) {
            $plugin = $installed->get($discovered['slug']);

            $instance = null;
            if (class_exists($discovered['namespace'])) {
                try {
                    $instance = new $discovered['namespace']($plugin?->config ?? []);
                } catch (\Throwable $e) {
                    // Plugin constructor failed — continue without instance data
                }
            }

            $isCore = $plugin?->isCorePlugin() ?? in_array($discovered['slug'], Plugin::CORE_PLUGINS);

            return [
                'id' => $plugin?->id,
                'slug' => $discovered['slug'],
                'name' => $discovered['name'],
                'description' => $discovered['description'],
                'type' => $discovered['type'],
                'version' => $discovered['version'],
                'author' => $discovered['author'],
                'icon' => $instance?->getIcon() ?? null,
                'is_installed' => $plugin !== null,
                'is_active' => $plugin?->isActive() ?? false,
                'is_configured' => $instance?->isConfigured() ?? false,
                'is_core' => $isCore,
                'config_schema' => $instance?->getConfigSchema() ?? [],
                'config' => $plugin?->config ?? [],
            ];
        })
            ->sortByDesc('is_core')  // Core plugins first
            ->values()
            ->toArray();
    }

    /**
     * Check if a plugin is installed by slug.
     */
    public function isInstalled(string $slug): bool
    {
        return Plugin::where('slug', $slug)->exists();
    }

    /**
     * Get installed plugin by slug.
     */
    public function getInstalledPlugin(string $slug): ?Plugin
    {
        return Plugin::where('slug', $slug)->first();
    }

    /**
     * Activate a plugin.
     */
    public function activate(Plugin $plugin): void
    {
        $plugin->activate();
    }

    /**
     * Deactivate a plugin.
     */
    public function deactivate(Plugin $plugin): void
    {
        $plugin->deactivate();
    }

    /**
     * Toggle plugin active state.
     */
    public function toggle(Plugin $plugin): void
    {
        if ($plugin->isActive()) {
            $plugin->deactivate();
        } else {
            $plugin->activate();
        }
    }

    /**
     * Get the slug for a gateway instance.
     */
    public function getGatewaySlug(PaymentGatewayPlugin $gateway): ?string
    {
        $plugin = Plugin::active()
            ->byType('payment_gateway')
            ->get()
            ->first(function ($p) use ($gateway) {
                return $p->getInstance() instanceof $gateway;
            });

        return $plugin?->slug;
    }

    /**
     * Validate plugin manifest required fields.
     *
     * @throws \Exception
     */
    private function validateManifest(array $manifest): void
    {
        $required = ['name', 'slug', 'type', 'main_class', 'namespace', 'version'];
        foreach ($required as $field) {
            if (empty($manifest[$field])) {
                throw new \Exception("Required field '{$field}' missing in plugin.json");
            }
        }
    }

    /**
     * Validate plugin requirements (PHP, Laravel versions).
     *
     * @throws \Exception
     */
    private function validateRequirements(array $requirements): void
    {
        if (isset($requirements['php'])) {
            $required = str_replace('>=', '', $requirements['php']);
            if (version_compare(PHP_VERSION, $required, '<')) {
                throw new \Exception("PHP {$required}+ required, found ".PHP_VERSION);
            }
        }
        if (isset($requirements['laravel'])) {
            $required = str_replace('>=', '', $requirements['laravel']);
            if (version_compare(app()->version(), $required, '<')) {
                throw new \Exception("Laravel {$required}+ required, found ".app()->version());
            }
        }
    }

    /**
     * Get the directory name for a plugin type.
     *
     * @throws \Exception
     */
    private function getTypeDirectory(string $type): string
    {
        return match ($type) {
            'payment_gateway' => 'PaymentGateways',
            default => throw new \Exception("Unknown plugin type: {$type}"),
        };
    }

    /**
     * Find the actual plugin directory on disk, checking multiple naming conventions.
     */
    private function findPluginDirectory(string $typeDir, string $slug): ?string
    {
        $basePath = app_path("Plugins/{$typeDir}");
        $candidates = [
            $basePath.'/'.Str::studly($slug),
            $basePath.'/'.$slug,
        ];

        foreach ($candidates as $path) {
            if (File::exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Process plugin migrations: copy to database/migrations and run them.
     *
     * @return array List of migrated file names
     *
     * @throws \Exception
     */
    private function processMigrations(string $pluginDir, array $migrations): array
    {
        $migratedFiles = [];
        $timestamp = now()->format('Y_m_d_His');

        foreach ($migrations as $index => $migration) {
            $sourcePath = $pluginDir.'/'.$migration;
            if (! File::exists($sourcePath)) {
                throw new \Exception("Migration not found: {$migration}");
            }

            $sequence = str_pad($index, 3, '0', STR_PAD_LEFT);
            $basename = preg_replace('/^\d+_/', '', basename($migration));
            $destFilename = "{$timestamp}{$sequence}_{$basename}";
            $destPath = database_path("migrations/{$destFilename}");

            File::copy($sourcePath, $destPath);

            try {
                Artisan::call('migrate', [
                    '--path' => "database/migrations/{$destFilename}",
                    '--force' => true,
                ]);
                $migratedFiles[] = $destFilename;
            } catch (\Exception $e) {
                // Cleanup the copied migration file on failure
                File::delete($destPath);
                throw new \Exception("Migration failed: {$basename}. Error: ".$e->getMessage());
            }
        }

        return $migratedFiles;
    }
}
