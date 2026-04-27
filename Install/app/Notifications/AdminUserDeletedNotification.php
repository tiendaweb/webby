<?php

namespace App\Notifications;

use App\Services\EmailThemeService;
use App\Traits\HandlesLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AdminUserDeletedNotification extends Notification implements ShouldQueue
{
    use HandlesLocale, Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public string $userName,
        public string $userEmail
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
        return $this->withLocale($this->getAdminLocale(), function () {
            $emailData = EmailThemeService::getEmailData();

            return (new MailMessage)
                ->subject(__('[Admin] User Account Deleted - :appName', ['appName' => $emailData['appName']]))
                ->view('emails.admin.user-deleted', array_merge($emailData, [
                    'userName' => $this->userName,
                    'userEmail' => $this->userEmail,
                    'deletedAt' => now()->format('F j, Y \a\t g:i A'),
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
            'user_name' => $this->userName,
            'user_email' => $this->userEmail,
            'event' => 'user_deleted',
        ];
    }
}
