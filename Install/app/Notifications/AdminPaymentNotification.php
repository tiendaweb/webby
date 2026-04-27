<?php

namespace App\Notifications;

use App\Models\Subscription;
use App\Models\SystemSetting;
use App\Models\Transaction;
use App\Models\User;
use App\Services\EmailThemeService;
use App\Traits\HandlesLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification as NotificationFacade;

class AdminPaymentNotification extends Notification implements ShouldQueue
{
    use HandlesLocale, Queueable;

    public string $eventType;

    public ?User $user;

    public ?Subscription $subscription;

    public ?Transaction $transaction;

    public array $extraData;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        string $eventType,
        ?User $user = null,
        ?Subscription $subscription = null,
        ?Transaction $transaction = null,
        array $extraData = []
    ) {
        $this->eventType = $eventType;
        $this->user = $user;
        $this->subscription = $subscription;
        $this->transaction = $transaction;
        $this->extraData = $extraData;
    }

    /**
     * Send admin notification if event is enabled and email is configured.
     */
    public static function sendIfEnabled(
        string $eventType,
        ?User $user = null,
        ?Subscription $subscription = null,
        ?Transaction $transaction = null,
        array $extraData = []
    ): void {
        $adminEmail = SystemSetting::get('admin_notification_email');
        $enabledEvents = SystemSetting::get('admin_notification_events', []);

        if (! $adminEmail || ! in_array($eventType, $enabledEvents)) {
            return;
        }

        try {
            NotificationFacade::route('mail', $adminEmail)
                ->notify(new self($eventType, $user, $subscription, $transaction, $extraData));
        } catch (\Exception $e) {
            Log::error('Failed to send AdminPaymentNotification', [
                'event_type' => $eventType,
                'admin_email' => $adminEmail,
                'user_id' => $user?->id,
                'error' => $e->getMessage(),
            ]);
        }
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
        return $this->withLocale($this->getAdminLocale(), function () {
            $emailData = EmailThemeService::getEmailData();
            $mailData = match ($this->eventType) {
                'subscription_activated' => $this->subscriptionActivatedData(),
                'payment_completed' => $this->paymentCompletedData(),
                'subscription_cancelled' => $this->subscriptionCancelledData(),
                'subscription_expired' => $this->subscriptionExpiredData(),
                'bank_transfer_pending' => $this->bankTransferPendingData(),
                default => $this->defaultData(),
            };

            return (new MailMessage)
                ->subject($mailData['subject'])
                ->view('emails.admin.payment-notification', array_merge($emailData, [
                    'title' => $mailData['title'],
                    'introLine' => $mailData['introLine'],
                    'customerName' => $this->user?->name,
                    'customerEmail' => $this->user?->email,
                    'details' => $mailData['detailsBox'],
                    'actionUrl' => $mailData['actionUrl'] ?? null,
                    'actionText' => $mailData['actionText'] ?? __('View Dashboard'),
                    'detailsTitle' => $mailData['detailsTitle'] ?? null,
                ]));
        });
    }

    protected function subscriptionActivatedData(): array
    {
        $plan = $this->subscription?->plan;

        return [
            'subject' => __('New Subscription Activated - :userName', ['userName' => $this->user?->name ?? 'Unknown']),
            'title' => __('New Subscription Activated'),
            'introLine' => __('A new subscription has been activated.'),
            'detailsBox' => [
                __('Plan') => $plan?->name ?? 'N/A',
                __('Amount') => '$'.number_format($plan?->price ?? 0, 2),
                __('Next Billing') => $this->subscription?->renewal_at?->format('M j, Y') ?? 'N/A',
            ],
            'actionUrl' => route('admin.subscriptions'),
            'actionText' => __('View Subscriptions'),
        ];
    }

    protected function paymentCompletedData(): array
    {
        $subscription = $this->transaction?->subscription ?? $this->subscription;
        $plan = $subscription?->plan;

        return [
            'subject' => __('Payment Received - :userName', ['userName' => $this->user?->name ?? 'Unknown']),
            'title' => __('Payment Received'),
            'introLine' => __('A payment has been received.'),
            'detailsBox' => [
                __('Amount') => '$'.number_format($this->transaction?->amount ?? 0, 2).' '.($this->transaction?->currency ?? 'USD'),
                __('Transaction ID') => $this->transaction?->transaction_id ?? $this->transaction?->id ?? 'N/A',
                __('Plan') => $plan?->name ?? 'N/A',
            ],
            'actionUrl' => route('admin.transactions'),
            'actionText' => __('View Transactions'),
        ];
    }

    protected function subscriptionCancelledData(): array
    {
        $plan = $this->subscription?->plan;

        return [
            'subject' => __('Subscription Cancelled - :userName', ['userName' => $this->user?->name ?? 'Unknown']),
            'title' => __('Subscription Cancelled'),
            'introLine' => __('A subscription has been cancelled.'),
            'detailsBox' => [
                __('Plan') => $plan?->name ?? 'N/A',
                __('End Date') => $this->subscription?->ends_at?->format('M j, Y') ?? 'N/A',
            ],
            'actionUrl' => route('admin.subscriptions'),
            'actionText' => __('View Subscriptions'),
        ];
    }

    protected function subscriptionExpiredData(): array
    {
        $plan = $this->subscription?->plan;

        return [
            'subject' => __('Subscription Expired - :userName', ['userName' => $this->user?->name ?? 'Unknown']),
            'title' => __('Subscription Expired'),
            'introLine' => __('A subscription has expired.'),
            'detailsBox' => [
                __('Plan') => $plan?->name ?? 'N/A',
            ],
            'actionUrl' => route('admin.subscriptions'),
            'actionText' => __('View Subscriptions'),
        ];
    }

    protected function bankTransferPendingData(): array
    {
        $plan = $this->subscription?->plan;

        return [
            'subject' => __('Bank Transfer Pending Approval - :userName', ['userName' => $this->user?->name ?? 'Unknown']),
            'title' => __('Bank Transfer Pending Approval'),
            'introLine' => __('A new bank transfer payment is awaiting approval.'),
            'detailsBox' => [
                __('Plan') => $plan?->name ?? 'N/A',
                __('Amount') => '$'.number_format($this->subscription?->amount ?? 0, 2),
                __('Reference') => $this->subscription?->external_subscription_id ?? 'N/A',
            ],
            'actionUrl' => route('admin.subscriptions'),
            'actionText' => __('Review Subscription'),
        ];
    }

    protected function defaultData(): array
    {
        return [
            'subject' => __('Admin Notification - :eventType', ['eventType' => $this->eventType]),
            'title' => __('Admin Notification'),
            'introLine' => __('An event has occurred: :eventType', ['eventType' => $this->eventType]),
            'detailsBox' => [],
            'actionUrl' => route('admin.overview'),
            'actionText' => __('View Dashboard'),
        ];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'event_type' => $this->eventType,
            'user_id' => $this->user?->id,
            'subscription_id' => $this->subscription?->id,
            'transaction_id' => $this->transaction?->id,
        ];
    }
}
