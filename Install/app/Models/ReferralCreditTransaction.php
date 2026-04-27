<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralCreditTransaction extends Model
{
    use HasFactory;

    public const TYPE_SIGNUP_BONUS = 'signup_bonus';

    public const TYPE_PURCHASE_COMMISSION = 'purchase_commission';

    public const TYPE_BILLING_REDEMPTION = 'billing_redemption';

    public const TYPE_ADMIN_ADJUSTMENT = 'admin_adjustment';

    public const TYPE_REFUND_CLAWBACK = 'refund_clawback';

    protected $fillable = [
        'user_id',
        'referral_id',
        'amount',
        'balance_after',
        'type',
        'description',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'metadata' => 'array',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function referral(): BelongsTo
    {
        return $this->belongsTo(Referral::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    /**
     * Check if this is a credit (positive amount).
     */
    public function isCredit(): bool
    {
        return $this->amount > 0;
    }

    /**
     * Check if this is a debit (negative amount).
     */
    public function isDebit(): bool
    {
        return $this->amount < 0;
    }

    /**
     * Get human-readable type label.
     */
    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            self::TYPE_SIGNUP_BONUS => 'Signup Bonus',
            self::TYPE_PURCHASE_COMMISSION => 'Purchase Commission',
            self::TYPE_BILLING_REDEMPTION => 'Billing Redemption',
            self::TYPE_ADMIN_ADJUSTMENT => 'Admin Adjustment',
            self::TYPE_REFUND_CLAWBACK => 'Refund Clawback',
            default => ucfirst(str_replace('_', ' ', $this->type)),
        };
    }

    /**
     * Get all available types.
     */
    public static function getTypes(): array
    {
        return [
            self::TYPE_SIGNUP_BONUS,
            self::TYPE_PURCHASE_COMMISSION,
            self::TYPE_BILLING_REDEMPTION,
            self::TYPE_ADMIN_ADJUSTMENT,
            self::TYPE_REFUND_CLAWBACK,
        ];
    }
}
