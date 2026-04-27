<?php

namespace App\Console\Commands;

use App\Models\CronLog;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SystemSetting;
use App\Notifications\AdminPaymentNotification;
use App\Notifications\SubscriptionExpiredNotification;
use App\Notifications\SubscriptionRenewalReminderNotification;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ManageSubscriptions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:manage
                            {--triggered-by=cron : Who triggered this command (cron or manual:user_id)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Manage subscriptions: expire overdue subscriptions and send renewal reminders';

    protected int $expired = 0;

    protected int $remindersSent = 0;

    protected int $errors = 0;

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $cronLog = CronLog::startLog(
            'Manage Subscriptions',
            self::class,
            $this->option('triggered-by')
        );

        try {
            $this->info('Managing subscriptions...');

            // Process expired subscriptions
            $this->processExpiredSubscriptions();

            // Send renewal reminders
            $this->sendRenewalReminders();

            $message = "Expired: {$this->expired}, Reminders sent: {$this->remindersSent}, Errors: {$this->errors}";
            $this->info("Completed. {$message}");

            $cronLog->markSuccess($message);

            Log::info('Subscription management completed', [
                'expired' => $this->expired,
                'reminders_sent' => $this->remindersSent,
                'errors' => $this->errors,
            ]);

            return self::SUCCESS;

        } catch (\Exception $e) {
            $this->error("Failed to manage subscriptions: {$e->getMessage()}");

            $cronLog->markFailed($e->getTraceAsString(), $e->getMessage());

            Log::error('Subscription management failed', [
                'error' => $e->getMessage(),
            ]);

            return self::FAILURE;
        }
    }

    /**
     * Process expired subscriptions.
     */
    protected function processExpiredSubscriptions(): void
    {
        $this->info('Processing expired subscriptions...');

        // Find active subscriptions that are past their renewal date or end date
        $expiredSubscriptions = Subscription::active()
            ->where(function ($query) {
                $query->where(function ($q) {
                    $q->whereNotNull('renewal_at')
                        ->where('renewal_at', '<', now());
                })->orWhere(function ($q) {
                    $q->whereNotNull('ends_at')
                        ->where('ends_at', '<', now());
                });
            })
            ->with(['user', 'plan'])
            ->get();

        $defaultPlanId = SystemSetting::get('default_plan_id');
        $defaultPlan = $defaultPlanId ? Plan::find($defaultPlanId) : null;

        foreach ($expiredSubscriptions as $subscription) {
            try {
                $user = $subscription->user;

                if (! $user) {
                    $this->line("  Skipped subscription #{$subscription->id}: No user");

                    continue;
                }

                // Expire the subscription
                $subscription->expire();

                // Reset user's plan to default
                if ($defaultPlan) {
                    $user->update(['plan_id' => $defaultPlan->id]);
                    $user->refillBuildCredits();
                }

                // Send notification to user
                $user->notify(new SubscriptionExpiredNotification($subscription));

                // Send in-app notification
                app(NotificationService::class)->notifySubscriptionExpired($user, $subscription);

                // Send notification to admin
                AdminPaymentNotification::sendIfEnabled(
                    'subscription_expired',
                    $user,
                    $subscription
                );

                $this->line("  Expired subscription #{$subscription->id} for user {$user->email}");
                $this->expired++;

            } catch (\Exception $e) {
                $this->error("  Failed to expire subscription #{$subscription->id}: {$e->getMessage()}");
                $this->errors++;

                Log::error('Failed to expire subscription', [
                    'subscription_id' => $subscription->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("  Processed {$this->expired} expired subscriptions");
    }

    /**
     * Send renewal reminders.
     */
    protected function sendRenewalReminders(): void
    {
        $this->info('Sending renewal reminders...');

        // Send 3-day reminder
        $this->sendRemindersForDays(3);

        // Send 1-day reminder (final reminder)
        $this->sendRemindersForDays(1);

        $this->info("  Sent {$this->remindersSent} renewal reminders");
    }

    /**
     * Send reminders for subscriptions expiring in N days.
     */
    protected function sendRemindersForDays(int $days): void
    {
        $startOfDay = now()->addDays($days)->startOfDay();
        $endOfDay = now()->addDays($days)->endOfDay();

        $subscriptions = Subscription::active()
            ->whereNotNull('renewal_at')
            ->whereBetween('renewal_at', [$startOfDay, $endOfDay])
            ->with(['user', 'plan'])
            ->get();

        foreach ($subscriptions as $subscription) {
            try {
                $user = $subscription->user;

                if (! $user) {
                    continue;
                }

                $user->notify(new SubscriptionRenewalReminderNotification($subscription, $days));

                $this->line("  Sent {$days}-day reminder to {$user->email}");
                $this->remindersSent++;

            } catch (\Exception $e) {
                $this->error("  Failed to send reminder for subscription #{$subscription->id}: {$e->getMessage()}");
                $this->errors++;

                Log::error('Failed to send renewal reminder', [
                    'subscription_id' => $subscription->id,
                    'days' => $days,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
