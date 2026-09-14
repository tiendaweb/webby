<?php

namespace App\Console\Commands;

use App\Models\CronLog;
use App\Models\ProjectAiConnectorActivation;
use App\Notifications\AiConnectorExpiredNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Expires past-due AI Connector activations (renewal_at/ends_at in the
 * past) and revokes their tokens so a lapsed module can't keep granting MCP
 * access — mirrors app/Console/Commands/ManageSubscriptions.php's structure.
 * one_time-priced activations have renewal_at=null and are skipped, same as
 * Plan's "lifetime" billing period is skipped by ManageSubscriptions.
 */
class ManageAiConnectorActivations extends Command
{
    protected $signature = 'ai-connector:manage
        {--triggered-by=cron : Who triggered this command (cron or manual:user_id)}';

    protected $description = 'Expire overdue AI Connector activations and revoke their tokens.';

    protected int $expired = 0;

    protected int $errors = 0;

    public function handle(): int
    {
        $cronLog = CronLog::startLog('Manage AI Connector Activations', self::class, $this->option('triggered-by'));

        try {
            $this->info('Managing AI Connector activations...');

            $overdue = ProjectAiConnectorActivation::where('status', ProjectAiConnectorActivation::STATUS_ACTIVE)
                ->where(function ($query) {
                    $query->where(function ($q) {
                        $q->whereNotNull('renewal_at')->where('renewal_at', '<', now());
                    })->orWhere(function ($q) {
                        $q->whereNotNull('ends_at')->where('ends_at', '<', now());
                    });
                })
                ->with(['project', 'user'])
                ->get();

            foreach ($overdue as $activation) {
                try {
                    $activation->update(['status' => ProjectAiConnectorActivation::STATUS_EXPIRED]);
                    $activation->tokens()->whereNull('revoked_at')->update(['revoked_at' => now()]);

                    if ($activation->user) {
                        $activation->user->notify(new AiConnectorExpiredNotification($activation));
                    }

                    $this->line("  Expired activation #{$activation->id} for project {$activation->project_id}");
                    $this->expired++;
                } catch (\Throwable $e) {
                    $this->error("  Failed to expire activation #{$activation->id}: {$e->getMessage()}");
                    $this->errors++;
                    Log::error('Failed to expire AI Connector activation', [
                        'activation_id' => $activation->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $message = "Expired: {$this->expired}, Errors: {$this->errors}";
            $this->info("Completed. {$message}");
            $cronLog->markSuccess($message);

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("Failed to manage AI Connector activations: {$e->getMessage()}");
            $cronLog->markFailed($e->getTraceAsString(), $e->getMessage());
            Log::error('AI Connector activation management failed', ['error' => $e->getMessage()]);

            return self::FAILURE;
        }
    }
}
