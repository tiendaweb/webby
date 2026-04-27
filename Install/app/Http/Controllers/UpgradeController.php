<?php

namespace App\Http\Controllers;

use App\Services\InstallerService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class UpgradeController extends Controller
{
    /**
     * Display the upgrade page with pending migrations
     */
    public function index(InstallerService $installer): Response
    {
        $pending = $installer->getPendingMigrations();

        if (empty($pending)) {
            abort(404);
        }

        return Inertia::render('Upgrade/Index', [
            'pendingMigrations' => $pending,
        ]);
    }

    /**
     * Run the upgrade (migrations)
     */
    public function run(InstallerService $installer)
    {
        $pending = $installer->getPendingMigrations();

        if (empty($pending)) {
            return redirect('/');
        }

        try {
            // Run migrations
            Artisan::call('migrate', ['--force' => true]);

            // Clear all caches
            Artisan::call('optimize:clear');
        } catch (\Throwable $e) {
            Log::error('Upgrade migration failed: '.$e->getMessage(), [
                'exception' => $e,
                'pending_migrations' => $pending,
            ]);

            return redirect()->back()->with('error',
                'Migration failed: '.$e->getMessage()
            );
        }

        return redirect()->route('upgrade.completed');
    }

    /**
     * Display the upgrade completed page
     */
    public function completed(): Response
    {
        return Inertia::render('Upgrade/Completed');
    }
}
