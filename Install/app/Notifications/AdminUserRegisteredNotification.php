<?php

namespace App\Notifications;

use App\Models\User;
use App\Services\EmailThemeService;
use App\Traits\HandlesLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AdminUserRegisteredNotification extends Notification implements ShouldQueue
{
    use HandlesLocale, Queueable;

    public function __construct(
        public User $user
    ) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        return $this->withLocale($this->getAdminLocale(), function () {
            $emailData = EmailThemeService::getEmailData();

            return (new MailMessage)
                ->subject(__('New User Registration - :appName', ['appName' => $emailData['appName']]))
                ->view('emails.admin.user-registered', array_merge($emailData, [
                    'userName' => $this->user->name,
                    'userEmail' => $this->user->email,
                    'registeredAt' => $this->user->created_at->format('F j, Y \a\t g:i A'),
                    'usersUrl' => route('admin.users'),
                ]));
        });
    }
}
