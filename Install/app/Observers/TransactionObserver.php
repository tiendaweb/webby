<?php

namespace App\Observers;

use App\Models\Transaction;
use App\Services\NotificationService;
use App\Services\ReferralService;

class TransactionObserver
{
    public function __construct(
        protected ReferralService $referralService,
        protected NotificationService $notificationService
    ) {}

    /**
     * Handle the Transaction "updated" event.
     * Process referral commission when transaction becomes completed.
     */
    public function updated(Transaction $transaction): void
    {
        // Check if status was changed to completed
        if ($transaction->wasChanged('status') && $transaction->status === Transaction::STATUS_COMPLETED) {
            $this->referralService->processPaymentCommission($transaction);
            $this->notifyPaymentCompleted($transaction);
        }

        // Check if status was changed to refunded
        if ($transaction->wasChanged('status') && $transaction->status === Transaction::STATUS_REFUNDED) {
            $this->referralService->processRefundClawback($transaction);
        }
    }

    /**
     * Handle the Transaction "created" event.
     * Process referral commission if created with completed status.
     */
    public function created(Transaction $transaction): void
    {
        // If transaction is created already completed (e.g., instant payment)
        if ($transaction->status === Transaction::STATUS_COMPLETED) {
            $this->referralService->processPaymentCommission($transaction);
            $this->notifyPaymentCompleted($transaction);
        }
    }

    /**
     * Send payment completion notification to user.
     */
    protected function notifyPaymentCompleted(Transaction $transaction): void
    {
        if (! $transaction->user) {
            return;
        }

        $this->notificationService->notifyPaymentCompleted($transaction->user, $transaction);

        // Also notify about subscription renewal if this is a renewal transaction
        if ($transaction->type === Transaction::TYPE_SUBSCRIPTION_RENEWAL && $transaction->subscription) {
            $this->notificationService->notifySubscriptionRenewed($transaction->user, $transaction->subscription);
        }
    }
}
