<?php

namespace App\Services;

use App\Models\Referral;
use App\Models\ReferralCode;
use App\Models\ReferralCreditTransaction;
use App\Models\SystemSetting;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReferralService
{
    /**
     * Check if referral system is enabled.
     */
    public function isEnabled(): bool
    {
        return (bool) SystemSetting::get('referral_enabled', false);
    }

    /**
     * Track a referral code click.
     */
    public function trackClick(ReferralCode $code, string $ipAddress): void
    {
        $code->incrementClicks();
    }

    /**
     * Resolve a referral code from code string or slug.
     */
    public function resolveCode(string $codeOrSlug): ?ReferralCode
    {
        return ReferralCode::active()
            ->where(function ($query) use ($codeOrSlug) {
                $query->where('code', $codeOrSlug)
                    ->orWhere('slug', $codeOrSlug);
            })
            ->first();
    }

    /**
     * Create a referral tracking record for a new user signup.
     */
    public function createReferral(User $referee, ReferralCode $code, ?string $ipAddress = null, ?string $userAgent = null): ?Referral
    {
        // Block self-referrals
        if ($code->user_id === $referee->id) {
            Log::warning('Self-referral attempt blocked', ['user_id' => $referee->id]);

            return null;
        }

        // Validate: user cannot already be referred
        if (Referral::where('referee_id', $referee->id)->exists()) {
            Log::warning('User already referred', ['referee_id' => $referee->id]);

            return null;
        }

        // Check for IP-based fraud (same IP registering multiple accounts)
        if ($ipAddress && $this->isIpSuspicious($ipAddress, $code)) {
            Log::warning('Suspicious IP detected for referral', [
                'ip' => $ipAddress,
                'code' => $code->code,
            ]);
            // Still create referral but flag for manual review
        }

        return DB::transaction(function () use ($referee, $code, $ipAddress, $userAgent) {
            $referral = Referral::create([
                'referrer_id' => $code->user_id,
                'referee_id' => $referee->id,
                'referral_code_id' => $code->id,
                'status' => Referral::STATUS_PENDING,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent ? substr($userAgent, 0, 255) : null,
            ]);

            // Update user tracking
            $referee->update([
                'referred_by_user_id' => $code->user_id,
                'referral_code_id_used' => $code->id,
            ]);

            // Increment signup counter
            $code->incrementSignups();

            // Award signup bonus to referrer (if configured)
            $signupBonus = (float) SystemSetting::get('referral_signup_bonus', 0);
            if ($signupBonus > 0) {
                $this->creditUser(
                    $code->user,
                    $signupBonus,
                    ReferralCreditTransaction::TYPE_SIGNUP_BONUS,
                    'Signup bonus for referring '.$referee->name,
                    $referral
                );
            }

            // Award build credits to referee (if configured)
            $refereeBonus = (int) SystemSetting::get('referral_referee_signup_bonus', 0);
            if ($refereeBonus > 0) {
                $referee->increment('build_credits', $refereeBonus);
            }

            return $referral;
        });
    }

    /**
     * Process a successful payment for referral commission.
     */
    public function processPaymentCommission(Transaction $transaction): void
    {
        if (! $this->isEnabled()) {
            return;
        }

        $user = $transaction->user;

        // Find pending referral for this user
        $referral = Referral::where('referee_id', $user->id)
            ->pending()
            ->first();

        if (! $referral) {
            return;
        }

        // Check commission type setting
        $commissionType = SystemSetting::get('referral_commission_type', 'first_payment');

        // For first_payment type, only process if this is the user's first completed transaction
        if ($commissionType === 'first_payment') {
            $previousTransactions = Transaction::where('user_id', $user->id)
                ->completed()
                ->where('id', '<', $transaction->id)
                ->exists();

            if ($previousTransactions) {
                return;
            }
        }

        // Calculate commission
        $commissionPercent = (int) SystemSetting::get('referral_commission_percent', 20);
        $commissionAmount = round(($transaction->amount * $commissionPercent) / 100, 2);

        if ($commissionAmount <= 0) {
            return;
        }

        DB::transaction(function () use ($referral, $transaction, $commissionAmount) {
            // Update referral status
            $referral->markAsConverted($transaction, $commissionAmount);

            // Credit referrer
            $this->creditUser(
                $referral->referrer,
                $commissionAmount,
                ReferralCreditTransaction::TYPE_PURCHASE_COMMISSION,
                "Commission from {$referral->referee->name}'s purchase",
                $referral
            );

            // Update referral code stats
            $referral->referralCode->recordConversion($commissionAmount);

            // Mark as credited
            $referral->markAsCredited();
        });

        Log::info('Referral commission processed', [
            'referral_id' => $referral->id,
            'referrer_id' => $referral->referrer_id,
            'amount' => $commissionAmount,
            'transaction_id' => $transaction->id,
        ]);
    }

    /**
     * Handle refund - clawback commission if applicable.
     */
    public function processRefundClawback(Transaction $refundTransaction): void
    {
        // Find the original transaction's referral
        $originalTransactionId = $refundTransaction->metadata['original_transaction_id'] ?? null;
        if (! $originalTransactionId) {
            return;
        }

        $referral = Referral::where('transaction_id', $originalTransactionId)
            ->where('status', Referral::STATUS_CREDITED)
            ->first();

        if (! $referral || ! $referral->commission_amount) {
            return;
        }

        // Clawback the commission
        $this->debitUser(
            $referral->referrer,
            $referral->commission_amount,
            ReferralCreditTransaction::TYPE_REFUND_CLAWBACK,
            'Commission clawback due to refund',
            $referral
        );

        $referral->update(['status' => Referral::STATUS_INVALID]);

        Log::info('Referral commission clawback processed', [
            'referral_id' => $referral->id,
            'amount' => $referral->commission_amount,
        ]);
    }

    /**
     * Credit a user with referral credits.
     */
    public function creditUser(User $user, float $amount, string $type, string $description, ?Referral $referral = null): ReferralCreditTransaction
    {
        $user->addReferralCredits($amount);
        $user->refresh();

        return ReferralCreditTransaction::create([
            'user_id' => $user->id,
            'referral_id' => $referral?->id,
            'amount' => $amount,
            'balance_after' => $user->referral_credit_balance,
            'type' => $type,
            'description' => $description,
        ]);
    }

    /**
     * Debit a user's referral credits.
     */
    public function debitUser(User $user, float $amount, string $type, string $description, ?Referral $referral = null): ReferralCreditTransaction
    {
        // Allow negative balance for clawbacks
        $user->decrement('referral_credit_balance', $amount);
        $user->refresh();

        return ReferralCreditTransaction::create([
            'user_id' => $user->id,
            'referral_id' => $referral?->id,
            'amount' => -$amount,
            'balance_after' => $user->referral_credit_balance,
            'type' => $type,
            'description' => $description,
        ]);
    }

    /**
     * Check if an IP is suspicious (too many referrals from same IP).
     */
    protected function isIpSuspicious(string $ip, ReferralCode $code): bool
    {
        $recentCount = Referral::where('referral_code_id', $code->id)
            ->where('ip_address', $ip)
            ->where('created_at', '>=', now()->subDays(7))
            ->count();

        return $recentCount >= 3;
    }

    /**
     * Get referral stats for a user.
     */
    public function getUserStats(User $user): array
    {
        $code = $user->referralCode;

        if (! $code) {
            return [
                'has_code' => false,
                'code' => null,
                'slug' => null,
                'share_url' => null,
                'total_clicks' => 0,
                'total_signups' => 0,
                'total_conversions' => 0,
                'total_earnings' => 0,
                'credit_balance' => (float) $user->referral_credit_balance,
                'pending_earnings' => 0,
            ];
        }

        $pendingEarnings = Referral::where('referrer_id', $user->id)
            ->where('status', Referral::STATUS_CONVERTED)
            ->sum('commission_amount');

        return [
            'has_code' => true,
            'code' => $code->code,
            'slug' => $code->slug,
            'share_url' => $code->getShareUrl(),
            'total_clicks' => $code->total_clicks,
            'total_signups' => $code->total_signups,
            'total_conversions' => $code->total_conversions,
            'total_earnings' => (float) $code->total_earnings,
            'credit_balance' => (float) $user->referral_credit_balance,
            'pending_earnings' => (float) $pendingEarnings,
        ];
    }
}
