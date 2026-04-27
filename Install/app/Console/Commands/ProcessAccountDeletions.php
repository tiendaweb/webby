<?php

namespace App\Console\Commands;

use App\Models\AccountDeletionRequest;
use App\Models\CronLog;
use App\Models\User;
use App\Notifications\AdminUserDeletedNotification;
use App\Services\AdminNotificationService;
use App\Services\AuditLogService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessAccountDeletions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'accounts:process-deletions
                            {--triggered-by=cron : Who triggered this command (cron or manual:user_id)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process scheduled account deletions that have passed their grace period';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $cronLog = CronLog::startLog(
            'Process Account Deletions',
            self::class,
            $this->option('triggered-by')
        );

        try {
            $this->info('Processing account deletions...');

            $dueRequests = AccountDeletionRequest::where('status', AccountDeletionRequest::STATUS_PENDING)
                ->where('scheduled_at', '<=', now())
                ->with('user')
                ->get();

            $processed = 0;
            $failed = 0;

            foreach ($dueRequests as $request) {
                $user = $request->user;

                if (! $user) {
                    $request->markAsCompleted();

                    continue;
                }

                try {
                    DB::beginTransaction();

                    // Store user info before deletion for audit log
                    $userId = $user->id;
                    $userEmail = $user->email;
                    $userName = $user->name;

                    // Delete all user data
                    $this->deleteUserData($user);

                    // Mark request as completed
                    $request->markAsCompleted();

                    // Log the deletion (user is now deleted)
                    AuditLogService::logAccountDeleted($userId, $userEmail);

                    // Notify admin
                    AdminNotificationService::notify(
                        'user_deleted',
                        new AdminUserDeletedNotification($userName, $userEmail)
                    );

                    DB::commit();

                    $this->line("Deleted account: {$userEmail}");
                    $processed++;

                } catch (\Exception $e) {
                    DB::rollBack();

                    Log::error('Failed to process account deletion', [
                        'user_id' => $user->id,
                        'error' => $e->getMessage(),
                    ]);

                    $this->error("Failed to delete account for user {$user->id}: {$e->getMessage()}");
                    $failed++;
                }
            }

            $message = "Processed: {$processed}, Failed: {$failed}";
            $this->info("Completed. {$message}");

            $cronLog->markSuccess($message);

            return self::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Failed to process account deletions: {$e->getMessage()}");

            $cronLog->markFailed($e->getTraceAsString(), $e->getMessage());

            Log::error('Account deletions processing failed', [
                'error' => $e->getMessage(),
            ]);

            return self::FAILURE;
        }
    }

    /**
     * Delete all data associated with a user.
     */
    protected function deleteUserData(User $user): void
    {
        // Delete projects (including soft-deleted ones)
        $user->projects()->withTrashed()->forceDelete();

        // Remove from shared projects
        $user->sharedProjects()->detach();

        // Delete subscriptions
        $user->subscriptions()->delete();

        // Delete transactions
        $user->transactions()->delete();

        // Delete consents
        $user->consents()->delete();

        // Delete data export requests and files
        $exportRequests = $user->dataExportRequests()->get();
        foreach ($exportRequests as $exportRequest) {
            if ($exportRequest->file_path && file_exists($exportRequest->file_path)) {
                unlink($exportRequest->file_path);
            }
        }
        $user->dataExportRequests()->delete();

        // Keep audit logs for compliance (but user_id will be null after deletion)
        // The audit log for deletion was already created

        // Finally, delete the user
        $user->forceDelete();
    }
}
