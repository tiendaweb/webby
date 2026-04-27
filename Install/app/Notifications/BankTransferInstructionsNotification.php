<?php

namespace App\Notifications;

use App\Helpers\CurrencyHelper;
use App\Models\Transaction;
use App\Services\EmailThemeService;
use App\Traits\HandlesLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BankTransferInstructionsNotification extends Notification implements ShouldQueue
{
    use HandlesLocale, Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Transaction $transaction,
        public string $instructions
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

            return (new MailMessage)
                ->subject(__('Bank Transfer Instructions - :appName', ['appName' => $emailData['appName']]))
                ->greeting(__('Hello :name!', ['name' => $notifiable->name ?? __('there')]))
                ->line(__('Thank you for your subscription. Please complete your bank transfer using the following details:'))
                ->line($this->instructions)
                ->line(__('**Amount**: :amount', ['amount' => CurrencyHelper::format($this->transaction->amount)]))
                ->line(__('**Reference**: :reference', ['reference' => $this->transaction->transaction_id]))
                ->line(__('Please include the reference number in your transfer to ensure proper processing.'))
                ->line(__('Your subscription will be activated once we confirm your payment.'))
                ->action(__('View Billing'), url('/billing'));
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
