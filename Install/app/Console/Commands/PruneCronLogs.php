<?php

namespace App\Console\Commands;

use App\Models\CronLog;
use Illuminate\Console\Command;

class PruneCronLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cron:prune
                            {--days=30 : Number of days to keep logs}
                            {--triggered-by=cron : Who triggered this command (cron or manual:user_id)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete cron logs older than the specified number of days';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $startTime = now();
        $cronLog = CronLog::startLog(
            'Prune Cron Logs',
            self::class,
            $this->option('triggered-by')
        );

        try {
            $days = (int) $this->option('days');

            $this->info("Pruning cron logs older than {$days} days...");

            $deleted = CronLog::pruneOld($days);

            $message = "Deleted {$deleted} old cron log entries.";
            $this->info($message);

            $cronLog->markSuccess($message);

            return self::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Failed to prune cron logs: {$e->getMessage()}");

            $cronLog->markFailed($e->getTraceAsString(), $e->getMessage());

            return self::FAILURE;
        }
    }
}
