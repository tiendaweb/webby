<?php

namespace App\Models;

use App\Contracts\Plugin as PluginContract;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Plugin extends Model
{
    use HasFactory;

    /**
     * Core plugins that are always installed and cannot be deleted.
     */
    public const CORE_PLUGINS = ['bank-transfer', 'paypal'];

    protected $fillable = [
        'name',
        'slug',
        'type',
        'class',
        'version',
        'status',
        'config',
        'metadata',
        'migrations',
        'installed_at',
    ];

    protected function casts(): array
    {
        return [
            'config' => 'encrypted:array',
            'metadata' => 'array',
            'migrations' => 'array',
            'installed_at' => 'datetime',
        ];
    }

    /**
     * Scope query to only active plugins.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope query to inactive plugins.
     */
    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }

    /**
     * Scope query to plugins of a specific type.
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Get an instance of the plugin with its configuration.
     */
    public function getInstance(): PluginContract
    {
        $class = $this->class;

        if (! class_exists($class)) {
            throw new \Exception("Plugin class {$class} not found");
        }

        return new $class($this->config);
    }

    /**
     * Check if plugin is active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Check if plugin is inactive.
     */
    public function isInactive(): bool
    {
        return $this->status === 'inactive';
    }

    /**
     * Activate the plugin.
     *
     * @throws \Exception
     */
    public function activate(): void
    {
        $instance = $this->getInstance();

        if (! $instance->isConfigured()) {
            throw new \Exception('Plugin must be configured before activation.');
        }

        $this->update(['status' => 'active']);
    }

    /**
     * Deactivate the plugin.
     */
    public function deactivate(): void
    {
        $this->update(['status' => 'inactive']);
    }

    /**
     * Update plugin configuration.
     */
    public function configure(array $config): void
    {
        $instance = $this->getInstance();
        $instance->validateConfig($config);

        $this->update(['config' => $config]);
    }

    /**
     * Get plugin's configuration schema.
     */
    public function getConfigSchema(): array
    {
        try {
            $instance = $this->getInstance();

            return $instance->getConfigSchema();
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Check if plugin is configured.
     */
    public function isConfigured(): bool
    {
        try {
            $instance = $this->getInstance();

            return $instance->isConfigured();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Check if this is a core plugin that cannot be deleted.
     */
    public function isCorePlugin(): bool
    {
        return in_array($this->slug, self::CORE_PLUGINS);
    }

    /**
     * Check if this plugin was installed via upload (not pre-existing).
     */
    public function isUploaded(): bool
    {
        return ! empty($this->migrations) || ($this->metadata['uploaded'] ?? false);
    }

    /**
     * Check if this plugin has migrations.
     */
    public function hasMigrations(): bool
    {
        return ! empty($this->migrations);
    }

    /**
     * Get the list of migrations for this plugin.
     */
    public function getMigrations(): array
    {
        return $this->migrations ?? [];
    }
}
