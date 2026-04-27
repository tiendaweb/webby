<?php

namespace App\Services;

use App\Models\ReferralCreditTransaction;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReferralRedemptionService
{
    /**
     * Get the minimum redemption amount from settings.
     */
    public function getMinRedemptionAmount(): float
    {
        return (float) SystemSetting::get('referral_min_redemption', 5.00);
    }

    /**
     * Check if a user can redeem credits (meets minimum balance).
     */
    public function canRedeem(User $user): bool
    {
        return (float) $user->referral_credit_balance >= $this->getMinRedemptionAmount();
    }

    /**
     * Get redemption options and info for a user.
     */
    public function getRedemptionOptions(User $user): array
    {
        $balance = (float) $user->referral_credit_balance;
        $minRedemption = $this->getMinRedemptionAmount();

        return [
            'can_redeem' => $balance >= $minRedemption,
            'balance' => $balance,
            'min_redemption' => $minRedemption,
        ];
    }

    /**
     * Redeem referral credits for a billing discount.
     */
    public function redeemForBillingDiscount(User $user, float $amount): array
    {
        $minRedemption = $this->getMinRedemptionAmount();

        if ($amount < $minRedemption) {
            return [
                'success' => false,
                'error' => 'Amount must be at least $'.number_format($minRedemption, 2),
            ];
        }

        if ((float) $user->referral_credit_balance < $amount) {
            return [
                'success' => false,
                'error' => 'Insufficient referral credit balance',
            ];
        }

        return DB::transaction(function () use ($user, $amount) {
            // Deduct referral credits
            $user->decrement('referral_credit_balance', $amount);
            $user->refresh();

            // Create transaction record
            $transaction = ReferralCreditTransaction::create([
                'user_id' => $user->id,
                'referral_id' => null,
                'amount' => -$amount,
                'balance_after' => $user->referral_credit_balance,
                'type' => ReferralCreditTransaction::TYPE_BILLING_REDEMPTION,
                'description' => "Applied \${$amount} to billing",
            ]);

            return [
                'success' => true,
                'discount_amount' => $amount,
                'transaction' => $transaction,
            ];
        });
    }
}
