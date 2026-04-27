<?php

namespace App\Console\Commands;

use App\Models\CronLog;
use App\Models\DataExportRequest;
use App\Models\SystemSetting;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class PruneDataExports extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'data:prune-exports
                            {--triggered-by=cron : Who triggered this command (cron or manual:user_id)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete expired data export files and mark requests as expired';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $cronLog = CronLog::startLog(
            'Prune Data Exports',
            self::class,
            $this->option('triggered-by')
        );

        try {
            $this->info('Pruning expired data exports...');

            $retentionDays = SystemSetting::get('data_retention_days_exports', 7);

            // Find expired export requests
            $expiredRequests = DataExportRequest::where('status', DataExportRequest::STATUS_COMPLETED)
                ->where('expires_at', '<', now())
                ->get();

            $deleted = 0;
            $failed = 0;

            foreach ($expiredRequests as $request) {
                try {
                    // Delete the file if it exists
                    if ($request->file_path && file_exists($request->file_path)) {
                        unlink($request->file_path);
                        $deleted++;
                    }

                    // Mark as expired
                    $request->update(['status' => DataExportRequest::STATUS_EXPIRED]);

                } catch (\Exception $e) {
                    Log::error('Failed to prune data export', [
                        'export_request_id' => $request->id,
                        'error' => $e->getMessage(),
                    ]);
                    $failed++;
                }
            }

            // Also clean up any orphaned files in the exports directory
            $orphaned = $this->cleanupOrphanedFiles();

            $message = "Deleted files: {$deleted}, Orphaned: {$orphaned}, Failed: {$failed}";
            $this->info("Completed. {$message}");

            $cronLog->markSuccess($message);

            return self::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Failed to prune data exports: {$e->getMessage()}");

            $cronLog->markFailed($e->getTraceAsString(), $e->getMessage());

            Log::error('Data exports pruning failed', [
                'error' => $e->getMessage(),
            ]);

            return self::FAILURE;
        }
    }

    /**
     * Clean up any orphaned export files that don't have database records.
     */
    protected function cleanupOrphanedFiles(): int
    {
        $exportsPath = storage_path('app/exports');
        $orphanedDeleted = 0;

        if (! is_dir($exportsPath)) {
            return 0;
        }

        $files = glob("{$exportsPath}/*.zip");

        foreach ($files as $file) {
            // Check if file has a corresponding database record
            $hasRecord = DataExportRequest::where('file_path', $file)
                ->whereIn('status', [
                    DataExportRequest::STATUS_COMPLETED,
                    DataExportRequest::STATUS_PROCESSING,
                ])
                ->exists();

            if (! $hasRecord) {
                // Check if file is old enough to delete (older than retention period)
                $fileAge = now()->diffInDays(\Carbon\Carbon::createFromTimestamp(filemtime($file)));
                $retentionDays = SystemSetting::get('data_retention_days_exports', 7);

                if ($fileAge > $retentionDays) {
                    unlink($file);
                    $this->line('Deleted orphaned file: '.basename($file));
                    $orphanedDeleted++;
                }
            }
        }

        return $orphanedDeleted;
    }
}
