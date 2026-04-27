<?php

namespace App\Console\Commands;

use App\Models\Builder;
use App\Models\CronLog;
use App\Models\Project;
use App\Services\BuilderService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CleanBuilderWorkspaces extends Command
{
    protected $signature = 'builder:clean-workspaces
                            {--dry-run : Show what would be deleted without actually deleting}
                            {--triggered-by=cron : Who triggered this command (cron or manual:user_id)}';

    protected $description = 'Remove orphaned workspaces from builder servers and local preview directories';

    public function handle(BuilderService $builderService): int
    {
        $cronLog = CronLog::startLog(
            'Clean Builder Workspaces',
            self::class,
            $this->option('triggered-by')
        );

        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->info('[DRY RUN] No deletions will be performed.');
        }

        try {
            $allProjectIds = Project::withTrashed()
                ->pluck('id')
                ->toArray();

            $this->info('Found '.count($allProjectIds).' projects in database (including trashed).');

            $totalDeleted = 0;
            $totalSkipped = 0;
            $totalFailed = 0;
            $totalOrphans = 0;
            $builderErrors = [];

            $builders = Builder::active()->get();
            $this->info("Processing {$builders->count()} active builder(s)...");

            foreach ($builders as $builder) {
                $this->info("  Builder: {$builder->name} ({$builder->full_url})");

                try {
                    $workspaceIds = $builderService->listWorkspaces($builder);
                    $this->info('    Workspaces on disk: '.count($workspaceIds));

                    $orphanIds = array_values(array_diff($workspaceIds, $allProjectIds));
                    $this->info('    Orphaned workspaces: '.count($orphanIds));
                    $totalOrphans += count($orphanIds);

                    if (empty($orphanIds)) {
                        continue;
                    }

                    if ($dryRun) {
                        foreach ($orphanIds as $id) {
                            $this->line("      [DRY RUN] Would delete: {$id}");
                        }

                        continue;
                    }

                    $result = $builderService->cleanupWorkspaces($builder, $orphanIds);

                    $totalDeleted += $result['deleted'] ?? 0;
                    $totalSkipped += $result['skipped'] ?? 0;
                    $totalFailed += $result['failed'] ?? 0;

                    $this->info("    Deleted: {$result['deleted']}, Skipped: {$result['skipped']}, Failed: {$result['failed']}");
                } catch (\Exception $e) {
                    $builderErrors[] = "Builder {$builder->name}: {$e->getMessage()}";
                    $this->error("    Error: {$e->getMessage()}");
                    Log::warning('Builder workspace cleanup failed for builder', [
                        'builder_id' => $builder->id,
                        'builder_name' => $builder->name,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $previewsDeleted = $this->cleanOrphanedPreviews($allProjectIds, $dryRun);

            $message = $dryRun
                ? "Dry run complete. Found {$totalOrphans} orphan(s) on builders, {$previewsDeleted} orphaned preview(s)."
                : "Cleanup complete. Deleted: {$totalDeleted} workspace(s), {$previewsDeleted} preview(s). Skipped: {$totalSkipped}. Failed: {$totalFailed}.";

            if (! empty($builderErrors)) {
                $message .= ' Errors: '.count($builderErrors).' builder(s) unreachable.';
            }

            $this->info($message);

            $cronLog->markSuccess($message);

            Log::info('Builder workspace cleanup completed', [
                'dry_run' => $dryRun,
                'orphans_found' => $totalOrphans,
                'deleted' => $totalDeleted,
                'skipped' => $totalSkipped,
                'failed' => $totalFailed,
                'previews_deleted' => $previewsDeleted,
                'builder_errors' => count($builderErrors),
            ]);

            return self::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Workspace cleanup failed: {$e->getMessage()}");

            $cronLog->markFailed($e->getTraceAsString(), $e->getMessage());

            Log::error('Builder workspace cleanup failed', [
                'error' => $e->getMessage(),
            ]);

            return self::FAILURE;
        }
    }

    protected function cleanOrphanedPreviews(array $allProjectIds, bool $dryRun): int
    {
        $disk = Storage::disk('local');

        if (! $disk->exists('previews')) {
            return 0;
        }

        $directories = $disk->directories('previews');
        $deleted = 0;

        foreach ($directories as $dir) {
            $projectId = basename($dir);

            if (! in_array($projectId, $allProjectIds)) {
                if ($dryRun) {
                    $this->line("  [DRY RUN] Would delete preview: {$projectId}");
                } else {
                    $disk->deleteDirectory($dir);
                    $this->line("  Deleted orphaned preview: {$projectId}");
                }
                $deleted++;
            }
        }

        if ($deleted > 0) {
            $this->info('Orphaned previews '.($dryRun ? 'found' : 'deleted').": {$deleted}");
        }

        return $deleted;
    }
}
