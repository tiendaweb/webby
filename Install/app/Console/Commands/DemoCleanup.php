<?php

namespace App\Console\Commands;

use App\Models\Builder;
use App\Models\CronLog;
use App\Models\User;
use App\Services\BuilderService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class DemoCleanup extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'demo:cleanup
                            {--triggered-by=cron : Who triggered this command (cron or manual:user_id)}';

    /**
     * The console command description.
     */
    protected $description = 'Cleanup demo environment and reseed (only works in demo mode)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        // Guard: Only run in demo mode
        if (! config('app.demo')) {
            $this->warn('Demo cleanup skipped: Not in demo mode (requires APP_ENV=local AND APP_DEMO=true)');

            return self::SUCCESS;
        }

        $cronLog = CronLog::startLog(
            'Demo Cleanup',
            self::class,
            $this->option('triggered-by')
        );

        Log::info('[DemoCleanup] Starting demo cleanup...');
        $this->info('Starting demo cleanup...');

        $warnings = [];

        try {
            // 1. Clean builder workspaces (all projects)
            $this->cleanBuilderWorkspaces();

            // 2. Delete all preview directories
            $previewWarnings = $this->cleanPreviewDirectories();
            $warnings = array_merge($warnings, $previewWarnings);

            // 3. Delete all project files from storage
            $fileWarnings = $this->cleanProjectFiles();
            $warnings = array_merge($warnings, $fileWarnings);

            // 4. Truncate/reset database tables
            $this->resetDatabase();

            // 5. Re-run seeders (critical — tables were truncated, must reseed)
            $this->reseedDatabase();

            $message = 'Demo cleanup completed successfully.';
            if (! empty($warnings)) {
                $message .= ' Warnings: '.count($warnings).' issue(s) encountered.';
            }

            Log::info('[DemoCleanup] '.$message);
            $this->info('Demo cleanup completed!');

            $cronLog->markSuccess($message);

            return self::SUCCESS;
        } catch (\Exception $e) {
            Log::error('[DemoCleanup] Failed: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            $this->error('Demo cleanup failed: '.$e->getMessage());

            $cronLog->markFailed($e->getTraceAsString(), $e->getMessage());

            return self::FAILURE;
        }
    }

    /**
     * Clean all workspaces from active builders.
     */
    private function cleanBuilderWorkspaces(): void
    {
        $builders = Builder::where('status', 'active')->get();

        if ($builders->isEmpty()) {
            $this->info('No active builders found');

            return;
        }

        $builderService = app(BuilderService::class);

        foreach ($builders as $builder) {
            try {
                $workspaces = $builderService->listWorkspaces($builder);

                if (! empty($workspaces)) {
                    $result = $builderService->cleanupWorkspaces($builder, $workspaces);
                    $this->info("Cleaned {$builder->name}: {$result['deleted']} workspaces deleted");
                } else {
                    $this->info("No workspaces found on {$builder->name}");
                }
            } catch (\Exception $e) {
                $this->warn("Failed to clean {$builder->name}: ".$e->getMessage());
            }
        }
    }

    /**
     * Delete all preview directories individually for resilience.
     *
     * @return array<string> Warnings for directories that failed to delete
     */
    private function cleanPreviewDirectories(): array
    {
        $disk = Storage::disk('local');
        $warnings = [];

        if (! $disk->exists('previews')) {
            $this->info('No preview directories to clean');

            return $warnings;
        }

        $directories = $disk->directories('previews');
        $deleted = 0;

        foreach ($directories as $directory) {
            try {
                $disk->deleteDirectory($directory);
                $deleted++;
            } catch (\Exception $e) {
                $warnings[] = "Failed to delete {$directory}: ".$e->getMessage();
                Log::warning("[DemoCleanup] Failed to delete preview directory: {$directory}", [
                    'error' => $e->getMessage(),
                ]);
                $this->warn("Failed to delete preview directory: {$directory}");
            }
        }

        $this->info("Cleaned {$deleted} preview directories");

        return $warnings;
    }

    /**
     * Delete all project file directories individually for resilience.
     *
     * @return array<string> Warnings for directories that failed to delete
     */
    private function cleanProjectFiles(): array
    {
        $disk = Storage::disk('local');
        $warnings = [];

        if (! $disk->exists('project-files')) {
            $this->info('No project files to clean');

            return $warnings;
        }

        $directories = $disk->directories('project-files');
        $deleted = 0;

        foreach ($directories as $directory) {
            try {
                $disk->deleteDirectory($directory);
                $deleted++;
            } catch (\Exception $e) {
                $warnings[] = "Failed to delete {$directory}: ".$e->getMessage();
                Log::warning("[DemoCleanup] Failed to delete project-files directory: {$directory}", [
                    'error' => $e->getMessage(),
                ]);
                $this->warn("Failed to delete project-files directory: {$directory}");
            }
        }

        $this->info("Cleaned {$deleted} project file directories");

        return $warnings;
    }

    /**
     * Reset database tables to clean state.
     *
     * Preserves system configuration and admin user.
     */
    private function resetDatabase(): void
    {
        // Disable foreign key checks
        Schema::disableForeignKeyConstraints();

        // Truncate user-generated data tables (preserve system config)
        $tables = [
            'projects',
            'project_files',
            'project_shares',
            'build_credit_usage',
            'subscriptions',
            'transactions',
            'referrals',
            'referral_codes',
            'referral_credit_transactions',
            'user_ai_settings',
            'user_notifications',
            'data_export_requests',
            'account_deletion_requests',
            'user_consents',
            'audit_logs',
            'plan_template',
            'landing_items',
            'landing_contents',
            'landing_sections',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                try {
                    $count = DB::table($table)->count();
                    DB::table($table)->truncate();
                    Log::info("[DemoCleanup] Truncated {$table} ({$count} rows)");
                } catch (\Exception $e) {
                    Log::error("[DemoCleanup] Failed to truncate {$table}: ".$e->getMessage());
                }
            }
        }

        // Delete non-admin users (preserves admin for demo access)
        $deletedUsers = User::where('role', '!=', 'admin')->count();
        User::where('role', '!=', 'admin')->delete();
        Log::info("[DemoCleanup] Deleted {$deletedUsers} non-admin users");

        // Reset admin user's referral balance (will be re-seeded)
        User::where('role', 'admin')->update(['referral_credit_balance' => 0]);

        // Re-enable foreign key checks
        Schema::enableForeignKeyConstraints();

        $this->info('Reset database tables');
    }

    /**
     * Re-run database seeders.
     */
    private function reseedDatabase(): void
    {
        $this->call('db:seed', ['--force' => true]);
        $this->info('Reseeded database');
    }
}
