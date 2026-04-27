<?php

namespace App\Console\Commands;

use App\Models\CronLog;
use App\Models\Project;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CheckStaleBuildSessions extends Command
{
    protected $signature = 'builder:check-stale-sessions
                            {--dry-run : Show what would be updated without making changes}
                            {--triggered-by=cron : Who triggered this command (cron or manual:user_id)}';

    protected $description = 'Check for stale building sessions and sync status from builder';

    // Sessions older than this are checked against builder
    private const MIN_AGE_MINUTES = 5;

    // Sessions older than this are force-failed regardless of builder
    private const HARD_TIMEOUT_MINUTES = 30;

    public function handle(): int
    {
        $cronLog = CronLog::startLog(
            'Check Stale Build Sessions',
            self::class,
            $this->option('triggered-by')
        );

        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->info('[DRY RUN] No updates will be performed.');
        }

        try {
            $checkedCount = 0;
            $updatedCount = 0;
            $timedOutCount = 0;
            $errors = [];

            // Find stale "building" sessions
            $staleProjects = Project::with('builder')
                ->where('build_status', 'building')
                ->where('build_started_at', '<', now()->subMinutes(self::MIN_AGE_MINUTES))
                ->get();

            $this->info("Found {$staleProjects->count()} stale building session(s) to check");

            foreach ($staleProjects as $project) {
                $checkedCount++;
                $minutesOld = (int) $project->build_started_at->diffInMinutes(now());

                // Hard timeout - force fail if too old
                if ($minutesOld >= self::HARD_TIMEOUT_MINUTES) {
                    $this->warn("Project {$project->id}: Hard timeout ({$minutesOld} min) - marking failed");

                    if (! $dryRun) {
                        $project->update([
                            'build_status' => 'failed',
                            'build_completed_at' => now(),
                        ]);
                    }
                    $timedOutCount++;

                    continue;
                }

                // Check builder for session status
                if (! $project->builder) {
                    $this->error("Project {$project->id}: No builder assigned");
                    $errors[] = "Project {$project->id}: No builder";

                    continue;
                }

                if (! $project->build_session_id) {
                    $this->error("Project {$project->id}: No session ID");
                    $errors[] = "Project {$project->id}: No session ID";

                    continue;
                }

                try {
                    $response = Http::timeout(10)
                        ->withHeaders(['X-Server-Key' => $project->builder->server_key])
                        ->get("{$project->builder->full_url}/api/status/{$project->build_session_id}");

                    if ($response->status() === 404) {
                        // Session not found - builder may have restarted
                        $this->warn("Project {$project->id}: Session not found (404) - marking failed");

                        if (! $dryRun) {
                            $project->update([
                                'build_status' => 'failed',
                                'build_completed_at' => now(),
                            ]);
                        }
                        $updatedCount++;
                    } elseif ($response->successful()) {
                        $status = $response->json('status');

                        // Check if terminal status
                        if (in_array($status, ['completed', 'failed', 'cancelled'])) {
                            $this->info("Project {$project->id}: Builder reports '{$status}' - syncing");

                            if (! $dryRun) {
                                $project->update([
                                    'build_status' => $status,
                                    'build_completed_at' => now(),
                                ]);
                            }
                            $updatedCount++;
                        } else {
                            $this->line("Project {$project->id}: Still {$status} ({$minutesOld} min old)");
                        }
                    } else {
                        $this->error("Project {$project->id}: Builder returned {$response->status()}");
                        $errors[] = "Project {$project->id}: HTTP {$response->status()}";
                    }
                } catch (\Exception $e) {
                    $this->error("Project {$project->id}: {$e->getMessage()}");
                    $errors[] = "Project {$project->id}: {$e->getMessage()}";
                }
            }

            // Summary
            $this->newLine();
            $this->info('Summary:');
            $this->line("  Checked: {$checkedCount}");
            $this->line("  Updated: {$updatedCount}");
            $this->line("  Timed out: {$timedOutCount}");
            $this->line('  Errors: '.count($errors));

            if ($dryRun) {
                $this->warn('DRY RUN - no changes made');
            }

            $message = $dryRun
                ? "Dry run complete. Checked: {$checkedCount}, would update: ".($updatedCount + $timedOutCount)
                : "Checked: {$checkedCount}, Updated: {$updatedCount}, Timed out: {$timedOutCount}, Errors: ".count($errors);

            if (count($errors) > 0) {
                $cronLog->markFailed(implode("\n", $errors), $message);

                Log::warning('Stale build session check completed with errors', [
                    'dry_run' => $dryRun,
                    'checked' => $checkedCount,
                    'updated' => $updatedCount,
                    'timed_out' => $timedOutCount,
                    'errors' => $errors,
                ]);

                return self::FAILURE;
            }

            $cronLog->markSuccess($message);

            Log::info('Stale build session check completed', [
                'dry_run' => $dryRun,
                'checked' => $checkedCount,
                'updated' => $updatedCount,
                'timed_out' => $timedOutCount,
            ]);

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Stale session check failed: {$e->getMessage()}");

            $cronLog->markFailed($e->getTraceAsString(), $e->getMessage());

            Log::error('Stale build session check failed', [
                'error' => $e->getMessage(),
            ]);

            return self::FAILURE;
        }
    }
}
