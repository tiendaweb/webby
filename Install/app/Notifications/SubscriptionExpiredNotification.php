<?php

namespace App\Notifications;

use App\Models\Subscription;
use App\Services\EmailThemeService;
use App\Traits\HandlesLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionExpiredNotification extends Notification implements ShouldQueue
{
    use HandlesLocale, Queueable;

    public Subscription $subscription;

    /**
     * Create a new notification instance.
     */
    public function __construct(Subscription $subscription)
    {
        $this->subscription = $subscription;
    }

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
        return $this->withLocale($this->getNotifiableLocale($notifiable), function () {
            $emailData = EmailThemeService::getEmailData();
            $plan = $this->subscription->plan;

            return (new MailMessage)
                ->subject(__('Your Subscription Has Expired - :appName', ['appName' => $emailData['appName']]))
                ->view('emails.user.subscription-expired', array_merge($emailData, [
                    'planName' => $plan?->name ?? 'N/A',
                    'dashboardUrl' => route('create'),
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
            'subscription_id' => $this->subscription->id,
            'plan_id' => $this->subscription->plan_id,
            'status' => 'expired',
        ];
    }
}
