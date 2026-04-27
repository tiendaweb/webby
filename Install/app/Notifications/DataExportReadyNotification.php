<?php

namespace App\Notifications;

use App\Models\DataExportRequest;
use App\Services\EmailThemeService;
use App\Traits\HandlesLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class DataExportReadyNotification extends Notification implements ShouldQueue
{
    use HandlesLocale, Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public DataExportRequest $exportRequest
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
            $downloadUrl = route('data-export.download', ['token' => $this->exportRequest->download_token]);
            $expiresAt = $this->exportRequest->expires_at->format('F j, Y \a\t g:i A');

            return (new MailMessage)
                ->subject(__('Your Data Export is Ready - :appName', ['appName' => $emailData['appName']]))
                ->view('emails.user.data-export-ready', array_merge($emailData, [
                    'userName' => $notifiable->name,
                    'downloadUrl' => $downloadUrl,
                    'expiresAt' => $expiresAt,
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
            'export_request_id' => $this->exportRequest->id,
            'status' => 'ready',
        ];
    }
}
