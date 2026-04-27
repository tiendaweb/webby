<?php

namespace App\Console\Commands;

use App\Models\CronLog;
use App\Models\SystemSetting;
use App\Services\SentryReporterService;
use Illuminate\Console\Command;

class FlushSentryReports extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sentry:flush
                            {--triggered-by=cron : Who triggered this command (cron or manual:user_id)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Flush buffered error reports to the Sentry endpoint';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $cronLog = CronLog::startLog(
            'Flush Sentry Reports',
            self::class,
            $this->option('triggered-by')
        );

        try {
            if (! SystemSetting::get('sentry_enabled', false)) {
                $cronLog->markSuccess('Sentry reporting is disabled — skipped');

                return self::SUCCESS;
            }

            $result = app(SentryReporterService::class)->flush();

            $message = "Sent {$result['sent']}, failed {$result['failed']}, pruned {$result['pruned']}";
            $this->info($message);

            $cronLog->markSuccess($message);

            return self::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Failed to flush sentry reports: {$e->getMessage()}");

            $cronLog->markFailed($e->getTraceAsString(), $e->getMessage());

            return self::FAILURE;
        }
    }
}
