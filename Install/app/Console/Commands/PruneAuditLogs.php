<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\CronLog;
use App\Models\SystemSetting;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class PruneAuditLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'data:prune-audit-logs
                            {--triggered-by=cron : Who triggered this command (cron or manual:user_id)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete audit logs older than the retention period';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $cronLog = CronLog::startLog(
            'Prune Audit Logs',
            self::class,
            $this->option('triggered-by')
        );

        try {
            $this->info('Pruning old audit logs...');

            $retentionDays = SystemSetting::get('data_retention_days_audit_logs', 365);

            $cutoffDate = now()->subDays($retentionDays);

            $deleted = AuditLog::where('created_at', '<', $cutoffDate)->delete();

            $message = "Deleted {$deleted} audit log entries older than {$retentionDays} days.";
            $this->info("Completed. {$message}");

            $cronLog->markSuccess($message);

            Log::info('Pruned old audit logs', [
                'deleted' => $deleted,
                'retention_days' => $retentionDays,
            ]);

            return self::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Failed to prune audit logs: {$e->getMessage()}");

            $cronLog->markFailed($e->getTraceAsString(), $e->getMessage());

            Log::error('Audit logs pruning failed', [
                'error' => $e->getMessage(),
            ]);

            return self::FAILURE;
        }
    }
}
