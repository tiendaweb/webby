<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Transaction extends Model
{
    use HasFactory;

    // Transaction statuses
    public const STATUS_COMPLETED = 'completed';

    public const STATUS_PENDING = 'pending';

    public const STATUS_FAILED = 'failed';

    public const STATUS_REFUNDED = 'refunded';

    // Transaction types
    public const TYPE_SUBSCRIPTION_NEW = 'subscription_new';

    public const TYPE_SUBSCRIPTION_RENEWAL = 'subscription_renewal';

    public const TYPE_REFUND = 'refund';

    public const TYPE_ADJUSTMENT = 'adjustment';

    public const TYPE_EXTENSION = 'extension';

    // Payment methods (mirrors Subscription constants)
    public const PAYMENT_PAYPAL = 'paypal';

    public const PAYMENT_BANK_TRANSFER = 'bank_transfer';

    public const PAYMENT_MANUAL = 'manual';

    public const PAYMENT_STRIPE = 'Stripe';

    public const PAYMENT_RAZORPAY = 'Razorpay';

    public const PAYMENT_PAYSTACK = 'Paystack';

    public const PAYMENT_CRYPTO_COM = 'Crypto.com';

    public const PAYMENT_REFERRAL = 'Referral Credits';

    protected $fillable = [
        'transaction_id',
        'external_transaction_id',
        'user_id',
        'subscription_id',
        'amount',
        'currency',
        'status',
        'type',
        'payment_method',
        'transaction_date',
        'metadata',
        'processed_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'transaction_date' => 'datetime',
            'metadata' => 'array',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Boot
    |--------------------------------------------------------------------------
    */

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($transaction) {
            if (empty($transaction->transaction_id)) {
                $transaction->transaction_id = 'TRX-'.strtoupper(Str::random(8));
            }

            if (empty($transaction->transaction_date)) {
                $transaction->transaction_date = now();
            }
        });
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

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    /**
     * Scope to completed transactions.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }

    /**
     * Scope to pending transactions.
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope to failed transactions.
     */
    public function scopeFailed($query)
    {
        return $query->where('status', self::STATUS_FAILED);
    }

    /**
     * Scope to refunded transactions.
     */
    public function scopeRefunded($query)
    {
        return $query->where('status', self::STATUS_REFUNDED);
    }

    /**
     * Scope by type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to new subscription transactions.
     */
    public function scopeNewSubscriptions($query)
    {
        return $query->where('type', self::TYPE_SUBSCRIPTION_NEW);
    }

    /**
     * Scope to renewal transactions.
     */
    public function scopeRenewals($query)
    {
        return $query->where('type', self::TYPE_SUBSCRIPTION_RENEWAL);
    }

    /**
     * Scope by payment method.
     */
    public function scopeByPaymentMethod($query, string $method)
    {
        return $query->where('payment_method', $method);
    }

    /**
     * Scope to transactions within a date range.
     */
    public function scopeBetweenDates($query, $start, $end)
    {
        return $query->whereBetween('transaction_date', [$start, $end]);
    }

    /**
     * Scope to this month's transactions.
     */
    public function scopeThisMonth($query)
    {
        return $query->whereYear('transaction_date', now()->year)
            ->whereMonth('transaction_date', now()->month);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    /**
     * Check if transaction is completed.
     */
    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    /**
     * Check if transaction is pending.
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if transaction failed.
     */
    public function isFailed(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    /**
     * Check if transaction was refunded.
     */
    public function isRefunded(): bool
    {
        return $this->status === self::STATUS_REFUNDED;
    }

    /**
     * Get formatted invoice number.
     */
    public function getInvoiceNumberAttribute(): string
    {
        $year = $this->created_at?->format('Y') ?? date('Y');

        return '#INV-'.$year.'-'.str_pad($this->id, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Get human-readable status.
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            self::STATUS_COMPLETED => 'Completed',
            self::STATUS_PENDING => 'Pending',
            self::STATUS_FAILED => 'Failed',
            self::STATUS_REFUNDED => 'Refunded',
            default => ucfirst($this->status),
        };
    }

    /**
     * Get human-readable type.
     */
    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            self::TYPE_SUBSCRIPTION_NEW => 'New Subscription',
            self::TYPE_SUBSCRIPTION_RENEWAL => 'Subscription Renewal',
            self::TYPE_REFUND => 'Refund',
            self::TYPE_ADJUSTMENT => 'Adjustment',
            self::TYPE_EXTENSION => 'Extension',
            default => ucfirst(str_replace('_', ' ', $this->type)),
        };
    }

    /**
     * Get human-readable payment method.
     */
    public function getPaymentMethodLabelAttribute(): string
    {
        return match ($this->payment_method) {
            self::PAYMENT_PAYPAL => 'PayPal',
            self::PAYMENT_BANK_TRANSFER => 'Bank Transfer',
            self::PAYMENT_MANUAL => 'Manual',
            self::PAYMENT_STRIPE => 'Stripe',
            self::PAYMENT_RAZORPAY => 'Razorpay',
            self::PAYMENT_PAYSTACK => 'Paystack',
            self::PAYMENT_CRYPTO_COM => 'Crypto.com',
            self::PAYMENT_REFERRAL => 'Referral Credits',
            default => ucfirst($this->payment_method ?? 'Unknown'),
        };
    }

    /**
     * Get formatted amount with currency.
     */
    public function getFormattedAmountAttribute(): string
    {
        $symbol = match ($this->currency) {
            'USD' => '$',
            'EUR' => "\u{20AC}",
            'GBP' => "\u{00A3}",
            default => $this->currency.' ',
        };

        return $symbol.number_format($this->amount, 2);
    }

    /**
     * Mark transaction as completed.
     */
    public function markAsCompleted(?array $metadata = null): bool
    {
        $updateData = ['status' => self::STATUS_COMPLETED];

        if ($metadata) {
            $updateData['metadata'] = array_merge($this->metadata ?? [], $metadata);
        }

        return $this->update($updateData);
    }

    /**
     * Mark transaction as failed.
     */
    public function markAsFailed(?string $reason = null): bool
    {
        $metadata = $this->metadata ?? [];
        if ($reason) {
            $metadata['failure_reason'] = $reason;
        }

        return $this->update([
            'status' => self::STATUS_FAILED,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Get all available statuses.
     */
    public static function getStatuses(): array
    {
        return [
            self::STATUS_COMPLETED,
            self::STATUS_PENDING,
            self::STATUS_FAILED,
            self::STATUS_REFUNDED,
        ];
    }

    /**
     * Get all available types.
     */
    public static function getTypes(): array
    {
        return [
            self::TYPE_SUBSCRIPTION_NEW,
            self::TYPE_SUBSCRIPTION_RENEWAL,
            self::TYPE_REFUND,
            self::TYPE_ADJUSTMENT,
            self::TYPE_EXTENSION,
        ];
    }
}
