<?php

namespace App\Notifications;

use App\Models\Transaction;
use App\Services\EmailThemeService;
use App\Traits\HandlesLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PaymentCompletedNotification extends Notification implements ShouldQueue
{
    use HandlesLocale, Queueable;

    public Transaction $transaction;

    /**
     * Create a new notification instance.
     */
    public function __construct(Transaction $transaction)
    {
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
        return $this->withLocale($this->getNotifiableLocale($notifiable), function () {
            $emailData = EmailThemeService::getEmailData();
            $subscription = $this->transaction->subscription;
            $plan = $subscription?->plan;

            return (new MailMessage)
                ->subject(__('Payment Received - :appName', ['appName' => $emailData['appName']]))
                ->view('emails.user.payment-completed', array_merge($emailData, [
                    'amount' => '$'.number_format($this->transaction->amount, 2).' '.$this->transaction->currency,
                    'transactionId' => $this->transaction->transaction_id ?? $this->transaction->id,
                    'planName' => $plan?->name ?? 'N/A',
                    'transactionDate' => $this->transaction->transaction_date?->format('F j, Y') ?? 'N/A',
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
            'transaction_id' => $this->transaction->id,
            'amount' => $this->transaction->amount,
            'currency' => $this->transaction->currency,
        ];
    }
}
