<?php

namespace App\Console\Commands;

use App\Models\CronLog;
use App\Models\Project;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class PurgeOldTrashedProjects extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'projects:purge-trash
                            {--triggered-by=cron : Who triggered this command (cron or manual:user_id)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Permanently delete projects in trash for over 30 days';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $cronLog = CronLog::startLog(
            'Purge Trashed Projects',
            self::class,
            $this->option('triggered-by')
        );

        try {
            $this->info('Purging old trashed projects...');

            $count = Project::onlyTrashed()
                ->where('deleted_at', '<', now()->subDays(30))
                ->forceDelete();

            $message = "Purged {$count} projects from trash.";
            $this->info($message);

            $cronLog->markSuccess($message);

            Log::info('Purged old trashed projects', [
                'count' => $count,
            ]);

            return self::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Failed to purge trashed projects: {$e->getMessage()}");

            $cronLog->markFailed($e->getTraceAsString(), $e->getMessage());

            Log::error('Failed to purge trashed projects', [
                'error' => $e->getMessage(),
            ]);

            return self::FAILURE;
        }
    }
}
