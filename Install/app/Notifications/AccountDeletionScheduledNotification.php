<?php

namespace App\Notifications;

use App\Models\AccountDeletionRequest;
use App\Models\SystemSetting;
use App\Services\EmailThemeService;
use App\Traits\HandlesLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountDeletionScheduledNotification extends Notification implements ShouldQueue
{
    use HandlesLocale, Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public AccountDeletionRequest $deletionRequest
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return $this->withLocale($this->getNotifiableLocale($notifiable), function () use ($notifiable) {
            $emailData = EmailThemeService::getEmailData();
            $cancelUrl = route('account.cancel-deletion', ['token' => $this->deletionRequest->cancellation_token]);
            $deletionDate = $this->deletionRequest->scheduled_at->format('F j, Y \a\t g:i A');
            $graceDays = SystemSetting::get('account_deletion_grace_days', 7);

            return (new MailMessage)
                ->subject(__('Account Deletion Scheduled - :appName', ['appName' => $emailData['appName']]))
                ->view('emails.user.account-deletion-scheduled', array_merge($emailData, [
                    'userName' => $notifiable->name,
                    'deletionDate' => $deletionDate,
                    'graceDays' => $graceDays,
                    'cancelUrl' => $cancelUrl,
                ]));
        });
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'deletion_request_id' => $this->deletionRequest->id,
            'scheduled_at' => $this->deletionRequest->scheduled_at->toIso8601String(),
        ];
    }
}
