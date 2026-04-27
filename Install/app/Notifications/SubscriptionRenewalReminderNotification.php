<?php

namespace App\Notifications;

use App\Models\Subscription;
use App\Services\EmailThemeService;
use App\Traits\HandlesLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionRenewalReminderNotification extends Notification implements ShouldQueue
{
    use HandlesLocale, Queueable;

    public Subscription $subscription;

    public int $daysUntilExpiration;

    /**
     * Create a new notification instance.
     */
    public function __construct(Subscription $subscription, int $daysUntilExpiration)
    {
        $this->subscription = $subscription;
        $this->daysUntilExpiration = $daysUntilExpiration;
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
            $renewalDate = $this->subscription->renewal_at?->format('F j, Y') ?? 'soon';

            $subject = $this->daysUntilExpiration === 1
                ? __('Your Subscription Expires Tomorrow - :appName', ['appName' => $emailData['appName']])
                : __('Your Subscription Expires in :days Days - :appName', ['days' => $this->daysUntilExpiration, 'appName' => $emailData['appName']]);

            $urgencyMessage = $this->daysUntilExpiration === 1
                ? __('Your subscription expires tomorrow!')
                : __('Your subscription will expire in :days days.', ['days' => $this->daysUntilExpiration]);

            return (new MailMessage)
                ->subject($subject)
                ->view('emails.user.subscription-renewal-reminder', array_merge($emailData, [
                    'planName' => $plan?->name ?? 'N/A',
                    'expirationDate' => $renewalDate,
                    'urgencyMessage' => $urgencyMessage,
                    'billingUrl' => route('billing.index'),
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
            'days_until_expiration' => $this->daysUntilExpiration,
        ];
    }
}
