<?php

namespace App\Notifications;

use App\Models\Subscription;
use App\Models\Transaction;
use App\Services\EmailThemeService;
use App\Traits\HandlesLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BankTransferPendingNotification extends Notification implements ShouldQueue
{
    use HandlesLocale, Queueable;

    public Subscription $subscription;

    public Transaction $transaction;

    /**
     * Create a new notification instance.
     */
    public function __construct(Subscription $subscription, Transaction $transaction)
    {
        $this->subscription = $subscription;
        $this->transaction = $transaction;
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
            $user = $this->subscription->user;
            $plan = $this->subscription->plan;

            return (new MailMessage)
                ->subject(__('New Bank Transfer Pending Approval - :appName', ['appName' => $emailData['appName']]))
                ->view('emails.admin.bank-transfer-pending', array_merge($emailData, [
                    'customerName' => $user?->name ?? 'Unknown',
                    'customerEmail' => $user?->email ?? 'Unknown',
                    'planName' => $plan?->name ?? 'Unknown',
                    'amount' => '$'.number_format($this->transaction->amount, 2),
                    'subscriptionId' => $this->subscription->external_subscription_id,
                    'reviewUrl' => route('admin.subscriptions'),
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
            'transaction_id' => $this->transaction->id,
            'amount' => $this->transaction->amount,
            'user_id' => $this->subscription->user_id,
        ];
    }
}
