<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ChecksDemoMode;
use App\Models\Plugin;
use App\Services\PluginManager;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PluginController extends Controller
{
    use ChecksDemoMode;

    public function __construct(
        private PluginManager $pluginManager
    ) {}

    /**
     * Display a listing of plugins.
     */
    public function index()
    {
        $plugins = $this->pluginManager->getPluginsForAdmin();

        return Inertia::render('Admin/Plugins', [
            'plugins' => $plugins,
        ]);
    }

    /**
     * Upload and install a plugin from ZIP file.
     */
    public function upload(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $request->validate([
            'plugin' => 'required|file|mimes:zip|max:10240',
        ]);

        try {
            $plugin = $this->pluginManager->installFromZip($request->file('plugin'));

            return back()->with('success', __('Plugin :name installed successfully.', ['name' => $plugin->name]));
        } catch (\Exception $e) {
            return back()->withErrors(['plugin' => $e->getMessage()]);
        }
    }

    /**
     * Install a plugin.
     */
    public function install(string $slug)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        try {
            $this->pluginManager->install($slug);

            return back()->with('success', 'Plugin installed successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['plugin' => $e->getMessage()]);
        }
    }

    /**
     * Configure a plugin.
     */
    public function configure(Request $request, string $slug)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $plugin = Plugin::where('slug', $slug)->first();

        if (! $plugin) {
            return back()->withErrors(['plugin' => 'Plugin not found. Please install it first.']);
        }

        try {
            $instance = $plugin->getInstance();

            // Validate the config
            $instance->validateConfig($request->all());

            // Save the config
            $this->pluginManager->configure($plugin, $request->all());

            return back()->with('success', 'Plugin configured successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['config' => $e->getMessage()]);
        }
    }

    /**
     * Toggle plugin active status.
     */
    public function toggle(string $slug)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $plugin = Plugin::where('slug', $slug)->first();

        if (! $plugin) {
            return back()->withErrors(['plugin' => 'Plugin not found. Please install it first.']);
        }

        try {
            // If activating, check if plugin is configured
            if ($plugin->status === 'inactive') {
                $instance = $plugin->getInstance();

                if (! $instance->isConfigured()) {
                    return back()->withErrors(['plugin' => 'Please configure the plugin before activating it.']);
                }

                $plugin->activate();
            } else {
                $plugin->deactivate();
            }

            $status = $plugin->status === 'active' ? 'activated' : 'deactivated';

            return back()->with('success', "Plugin {$status} successfully.");
        } catch (\Exception $e) {
            return back()->withErrors(['plugin' => $e->getMessage()]);
        }
    }

    /**
     * Get plugin configuration schema.
     */
    public function getConfigSchema(string $slug)
    {
        $plugin = Plugin::where('slug', $slug)->first();

        if (! $plugin) {
            // Try to get from discovered plugins
            $discovered = $this->pluginManager->discover();
            $pluginData = collect($discovered)->firstWhere('slug', $slug);

            if (! $pluginData) {
                return response()->json(['error' => 'Plugin not found'], 404);
            }

            // Create temporary instance to get schema
            $class = $pluginData['namespace'];
            try {
                $instance = new $class;
            } catch (\Throwable $e) {
                return response()->json(['error' => 'Plugin class could not be loaded'], 500);
            }

            return response()->json([
                'schema' => $instance->getConfigSchema(),
                'config' => [],
            ]);
        }

        $instance = $plugin->getInstance();

        return response()->json([
            'schema' => $instance->getConfigSchema(),
            'config' => $plugin->config ?? [],
        ]);
    }

    /**
     * Uninstall a plugin.
     */
    public function uninstall(string $slug)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $plugin = Plugin::where('slug', $slug)->first();

        if (! $plugin) {
            return back()->withErrors(['plugin' => 'Plugin not found.']);
        }

        try {
            $this->pluginManager->uninstall($plugin);

            return back()->with('success', 'Plugin uninstalled successfully.');
        } catch (\Exception $e) {
            return back()->withErrors(['plugin' => $e->getMessage()]);
        }
    }
}
