<?php

namespace App\Http\Controllers;

use App\Services\InstallerService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class InstallController extends Controller
{
    /**
     * Display the welcome page
     */
    public function welcome(): Response
    {
        return Inertia::render('Install/Welcome');
    }

    /**
     * Display the requirements check page
     */
    public function requirements(InstallerService $installer): Response
    {
        return Inertia::render('Install/Requirements', [
            'dependencies' => $installer->dependencies,
        ]);
    }

    /**
     * Display the permissions check page
     */
    public function permissions(InstallerService $installer): Response
    {
        return Inertia::render('Install/Permissions', [
            'permissions' => $installer->permissions,
        ]);
    }

    /**
     * Display the database configuration page
     */
    public function database(InstallerService $installer): Response
    {
        return Inertia::render('Install/Database', [
            'sqliteAvailable' => $installer->dependencies['PDO SQLite (Optional)'] ?? false,
        ]);
    }

    /**
     * Store the database configuration
     */
    public function storeDatabase(Request $request, InstallerService $installer)
    {
        $rules = ['db_type' => ['required', 'in:mysql,sqlite']];

        if ($request->db_type === 'mysql') {
            $rules = array_merge($rules, [
                'host' => ['required', 'string', 'max:255'],
                'port' => ['required', 'integer', 'min:1', 'max:65535'],
                'database' => ['required', 'string', 'max:255'],
                'username' => ['required', 'string', 'max:255'],
                'password' => ['nullable', 'string'],
            ]);
        }

        $validated = $request->validate($rules);

        if (! $installer->testDatabaseConnection($validated)) {
            $message = $request->db_type === 'sqlite'
                ? 'Failed to create or access SQLite database.'
                : 'Failed to connect to database. Please check your credentials.';

            return back()->withErrors(['database' => $message]);
        }

        try {
            $installer->createConfig($validated);

            return redirect()->route('install.admin');
        } catch (\Exception $e) {
            return back()->withErrors(['database' => $e->getMessage()]);
        }
    }

    /**
     * Display the admin user creation page
     */
    public function admin(): Response
    {
        return Inertia::render('Install/Admin');
    }

    /**
     * Create the admin user and complete installation
     */
    public function storeAdmin(Request $request, InstallerService $installer)
    {
        $validated = $request->validate([
            'site_name' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'purchase_code' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $installer->createAdmin($validated);

            return redirect()->route('install.completed');
        } catch (\Exception $e) {
            \Log::error('Admin creation failed: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return back()->withErrors(['error' => 'Installation failed: '.$e->getMessage()]);
        }
    }

    /**
     * Display the installation completed page
     */
    public function completed(): Response
    {
        return Inertia::render('Install/Completed');
    }
}
