<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use HasFactory;

    // Subscription statuses
    public const STATUS_ACTIVE = 'active';

    public const STATUS_PENDING = 'pending';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_CANCELLED = 'cancelled';

    // Payment methods
    public const PAYMENT_PAYPAL = 'paypal';

    public const PAYMENT_BANK_TRANSFER = 'bank_transfer';

    public const PAYMENT_MANUAL = 'manual';

    public const PAYMENT_STRIPE = 'Stripe';

    public const PAYMENT_RAZORPAY = 'Razorpay';

    public const PAYMENT_PAYSTACK = 'Paystack';

    public const PAYMENT_CRYPTO_COM = 'Crypto.com';

    public const PAYMENT_REFERRAL = 'Referral Credits';

    protected $fillable = [
        'user_id',
        'plan_id',
        'status',
        'amount',
        'payment_method',
        'external_subscription_id',
        'billing_info',
        'approved_by',
        'approved_at',
        'admin_notes',
        'payment_proof',
        'starts_at',
        'renewal_at',
        'ends_at',
        'cancelled_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'billing_info' => 'array',
            'metadata' => 'array',
            'approved_at' => 'datetime',
            'starts_at' => 'datetime',
            'renewal_at' => 'datetime',
            'ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
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

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    /**
     * Scope to active subscriptions only.
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * Scope to pending subscriptions (awaiting approval).
     */
    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope to expired subscriptions.
     */
    public function scopeExpired($query)
    {
        return $query->where('status', self::STATUS_EXPIRED);
    }

    /**
     * Scope to cancelled subscriptions.
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', self::STATUS_CANCELLED);
    }

    /**
     * Scope to subscriptions expiring soon (within X days).
     */
    public function scopeExpiringSoon($query, int $days = 7)
    {
        return $query->where('status', self::STATUS_ACTIVE)
            ->whereNotNull('renewal_at')
            ->whereBetween('renewal_at', [now(), now()->addDays($days)]);
    }

    /**
     * Scope to subscriptions due for renewal.
     */
    public function scopeDueForRenewal($query)
    {
        return $query->where('status', self::STATUS_ACTIVE)
            ->whereNotNull('renewal_at')
            ->where('renewal_at', '<=', now());
    }

    /**
     * Scope to bank transfer subscriptions awaiting approval.
     */
    public function scopeAwaitingApproval($query)
    {
        return $query->where('status', self::STATUS_PENDING)
            ->where('payment_method', self::PAYMENT_BANK_TRANSFER)
            ->whereNull('approved_at');
    }

    /**
     * Scope by payment method.
     */
    public function scopeByPaymentMethod($query, string $method)
    {
        return $query->where('payment_method', $method);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    /**
     * Check if subscription is active.
     */
    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Check if subscription is pending approval.
     */
    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    /**
     * Check if subscription requires admin approval.
     */
    public function requiresApproval(): bool
    {
        return $this->payment_method === self::PAYMENT_BANK_TRANSFER
            && $this->status === self::STATUS_PENDING
            && $this->approved_at === null;
    }

    /**
     * Check if subscription is expired.
     */
    public function isExpired(): bool
    {
        return $this->status === self::STATUS_EXPIRED
            || ($this->ends_at && $this->ends_at->isPast());
    }

    /**
     * Check if subscription is cancelled.
     */
    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    /**
     * Check if this is a PayPal subscription.
     */
    public function isPayPal(): bool
    {
        return $this->payment_method === self::PAYMENT_PAYPAL;
    }

    /**
     * Check if this is a bank transfer subscription.
     */
    public function isBankTransfer(): bool
    {
        return $this->payment_method === self::PAYMENT_BANK_TRANSFER;
    }

    /**
     * Get days until renewal.
     */
    public function getDaysUntilRenewalAttribute(): ?int
    {
        if (! $this->renewal_at || ! $this->isActive()) {
            return null;
        }

        return max(0, (int) now()->diffInDays($this->renewal_at, false));
    }

    /**
     * Get human-readable status.
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            self::STATUS_ACTIVE => 'Active',
            self::STATUS_PENDING => 'Pending Approval',
            self::STATUS_EXPIRED => 'Expired',
            self::STATUS_CANCELLED => 'Cancelled',
            default => ucfirst($this->status),
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
     * Approve the subscription (for bank transfers).
     */
    public function approve(User $admin, ?string $notes = null): bool
    {
        if (! $this->requiresApproval()) {
            return false;
        }

        $this->update([
            'status' => self::STATUS_ACTIVE,
            'approved_by' => $admin->id,
            'approved_at' => now(),
            'admin_notes' => $notes,
            'starts_at' => now(),
            'renewal_at' => $this->calculateNextRenewal(),
        ]);

        // Update user's plan
        $this->user->update(['plan_id' => $this->plan_id]);

        return true;
    }

    /**
     * Cancel the subscription.
     */
    public function cancel(?int $cancelledById = null, bool $immediate = false, ?string $reason = null): bool
    {
        $metadata = $this->metadata ?? [];
        $metadata['cancellation_reason'] = $reason;
        $metadata['cancelled_by'] = $cancelledById;

        $updates = [
            'status' => self::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'metadata' => $metadata,
        ];

        if ($immediate) {
            $updates['ends_at'] = now();
        }

        $this->update($updates);

        return true;
    }

    /**
     * Expire the subscription.
     */
    public function expire(): bool
    {
        $this->update([
            'status' => self::STATUS_EXPIRED,
            'ends_at' => $this->ends_at ?? now(),
        ]);

        return true;
    }

    /**
     * Extend the subscription by a number of days.
     */
    public function extend(int $days): bool
    {
        $currentRenewal = $this->renewal_at ?? now();

        $this->update([
            'renewal_at' => $currentRenewal->addDays($days),
            'status' => self::STATUS_ACTIVE,
        ]);

        return true;
    }

    /**
     * Calculate next renewal date based on plan billing period.
     */
    public function calculateNextRenewal(): \Carbon\Carbon
    {
        $billingPeriod = $this->plan->billing_period ?? 'monthly';

        return match ($billingPeriod) {
            'yearly' => now()->addYear(),
            'lifetime' => now()->addYears(100), // Effectively never
            default => now()->addMonth(),
        };
    }

    /**
     * Get all available statuses.
     */
    public static function getStatuses(): array
    {
        return [
            self::STATUS_ACTIVE,
            self::STATUS_PENDING,
            self::STATUS_EXPIRED,
            self::STATUS_CANCELLED,
        ];
    }

    /**
     * Get all available payment methods.
     */
    public static function getPaymentMethods(): array
    {
        return [
            self::PAYMENT_PAYPAL,
            self::PAYMENT_BANK_TRANSFER,
            self::PAYMENT_MANUAL,
            self::PAYMENT_STRIPE,
            self::PAYMENT_RAZORPAY,
            self::PAYMENT_PAYSTACK,
            self::PAYMENT_CRYPTO_COM,
            self::PAYMENT_REFERRAL,
        ];
    }

    /**
     * Get the payment_method constant value for a given plugin slug.
     */
    public static function getPaymentMethodConstant(string $slug): ?string
    {
        return match ($slug) {
            'paypal' => self::PAYMENT_PAYPAL,
            'bank-transfer' => self::PAYMENT_BANK_TRANSFER,
            'stripe' => self::PAYMENT_STRIPE,
            'razorpay' => self::PAYMENT_RAZORPAY,
            'paystack' => self::PAYMENT_PAYSTACK,
            'cryptocom' => self::PAYMENT_CRYPTO_COM,
            default => null,
        };
    }
}
