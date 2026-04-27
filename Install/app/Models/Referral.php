<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Referral extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_CONVERTED = 'converted';

    public const STATUS_CREDITED = 'credited';

    public const STATUS_INVALID = 'invalid';

    protected $fillable = [
        'referrer_id',
        'referee_id',
        'referral_code_id',
        'status',
        'ip_address',
        'user_agent',
        'converted_at',
        'credited_at',
        'transaction_id',
        'commission_amount',
    ];

    protected function casts(): array
    {
        return [
            'converted_at' => 'datetime',
            'credited_at' => 'datetime',
            'commission_amount' => 'decimal:2',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referrer_id');
    }

    public function referee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referee_id');
    }

    public function referralCode(): BelongsTo
    {
        return $this->belongsTo(ReferralCode::class);
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeConverted($query)
    {
        return $query->where('status', self::STATUS_CONVERTED);
    }

    public function scopeCredited($query)
    {
        return $query->where('status', self::STATUS_CREDITED);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isConverted(): bool
    {
        return $this->status === self::STATUS_CONVERTED;
    }

    public function isCredited(): bool
    {
        return $this->status === self::STATUS_CREDITED;
    }

    /**
     * Get human-readable status label.
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            self::STATUS_PENDING => 'Pending',
            self::STATUS_CONVERTED => 'Converted',
            self::STATUS_CREDITED => 'Credited',
            self::STATUS_INVALID => 'Invalid',
            default => ucfirst($this->status),
        };
    }

    /**
     * Mark the referral as converted with transaction and commission details.
     */
    public function markAsConverted(Transaction $transaction, float $commissionAmount): void
    {
        $this->update([
            'status' => self::STATUS_CONVERTED,
            'converted_at' => now(),
            'transaction_id' => $transaction->id,
            'commission_amount' => $commissionAmount,
        ]);
    }

    /**
     * Mark the referral as credited (commission paid to referrer).
     */
    public function markAsCredited(): void
    {
        $this->update([
            'status' => self::STATUS_CREDITED,
            'credited_at' => now(),
        ]);
    }

    /**
     * Mark the referral as invalid (fraud, refund, etc.).
     */
    public function markAsInvalid(): void
    {
        $this->update(['status' => self::STATUS_INVALID]);
    }

    /**
     * Get all available statuses.
     */
    public static function getStatuses(): array
    {
        return [
            self::STATUS_PENDING,
            self::STATUS_CONVERTED,
            self::STATUS_CREDITED,
            self::STATUS_INVALID,
        ];
    }
}
