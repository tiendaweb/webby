<?php

namespace App\Console\Commands;

use App\Models\CronLog;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ResetBuildCredits extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'credits:reset
                            {--dry-run : Show what would happen without making changes}
                            {--user= : Reset credits for a specific user ID only}
                            {--triggered-by=cron : Who triggered this command (cron or manual:user_id)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset build credits for all users based on their plan allocation';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $userId = $this->option('user');

        $cronLog = CronLog::startLog(
            'Reset Build Credits',
            self::class,
            $this->option('triggered-by')
        );

        try {
            if ($dryRun) {
                $this->info('DRY RUN - No changes will be made');
            }

            $this->info('Starting build credits reset...');

            $query = User::with('plan')
                ->whereNotNull('plan_id');

            if ($userId) {
                $query->where('id', $userId);
            }

            $totalProcessed = 0;
            $totalReset = 0;
            $totalSkipped = 0;

            $query->chunk(100, function ($users) use ($dryRun, &$totalProcessed, &$totalReset, &$totalSkipped) {
                foreach ($users as $user) {
                    $totalProcessed++;
                    $plan = $user->getCurrentPlan();

                    if (! $plan) {
                        $this->line("  Skipped user {$user->id} ({$user->email}): No plan");
                        $totalSkipped++;

                        continue;
                    }

                    if ($plan->hasUnlimitedBuildCredits()) {
                        $this->line("  Skipped user {$user->id} ({$user->email}): Unlimited credits");
                        $totalSkipped++;

                        continue;
                    }

                    $newCredits = $plan->getMonthlyBuildCredits();
                    $oldCredits = $user->build_credits;

                    if (! $dryRun) {
                        $user->refillBuildCredits();
                    }

                    $this->line("  Reset user {$user->id} ({$user->email}): {$oldCredits} -> {$newCredits}");
                    $totalReset++;
                }
            });

            $this->newLine();
            $this->info('Build credits reset complete:');
            $this->table(
                ['Metric', 'Count'],
                [
                    ['Total Processed', $totalProcessed],
                    ['Reset', $totalReset],
                    ['Skipped', $totalSkipped],
                ]
            );

            $message = "Processed: {$totalProcessed}, Reset: {$totalReset}, Skipped: {$totalSkipped}";

            if (! $dryRun) {
                Log::info('Build credits reset completed', [
                    'processed' => $totalProcessed,
                    'reset' => $totalReset,
                    'skipped' => $totalSkipped,
                ]);
            } else {
                $message .= ' (dry run)';
            }

            $cronLog->markSuccess($message);

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Failed to reset build credits: {$e->getMessage()}");

            $cronLog->markFailed($e->getTraceAsString(), $e->getMessage());

            Log::error('Build credits reset failed', [
                'error' => $e->getMessage(),
            ]);

            return Command::FAILURE;
        }
    }
}
