<?php

namespace App\Notifications;

use App\Services\EmailThemeService;
use App\Traits\HandlesLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountDeletionCancelledNotification extends Notification implements ShouldQueue
{
    use HandlesLocale, Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct() {}

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

            return (new MailMessage)
                ->subject(__('Account Deletion Cancelled - :appName', ['appName' => $emailData['appName']]))
                ->view('emails.user.account-deletion-cancelled', array_merge($emailData, [
                    'userName' => $notifiable->name,
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
            'status' => 'cancelled',
        ];
    }
}
