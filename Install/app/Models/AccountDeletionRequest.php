<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AccountDeletionRequest extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_CANCELLED = 'cancelled';

    public const STATUS_COMPLETED = 'completed';

    protected $fillable = [
        'user_id',
        'status',
        'confirmation_token',
        'cancellation_token',
        'scheduled_at',
        'confirmed_at',
        'cancelled_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Create a new deletion request for a user.
     */
    public static function createForUser(User $user): self
    {
        $graceDays = SystemSetting::get('account_deletion_grace_days', 7);

        return static::create([
            'user_id' => $user->id,
            'status' => self::STATUS_PENDING,
            'confirmation_token' => Str::random(64),
            'cancellation_token' => Str::random(64),
            'scheduled_at' => now()->addDays($graceDays),
        ]);
    }

    /**
     * Check if the request can be cancelled.
     */
    public function canBeCancelled(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_CONFIRMED])
            && $this->scheduled_at->isFuture();
    }

    /**
     * Cancel the deletion request.
     */
    public function cancel(): bool
    {
        if (! $this->canBeCancelled()) {
            return false;
        }

        return $this->update([
            'status' => self::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);
    }

    /**
     * Confirm the deletion request.
     */
    public function confirm(): bool
    {
        return $this->update([
            'status' => self::STATUS_CONFIRMED,
            'confirmed_at' => now(),
        ]);
    }

    /**
     * Mark as completed.
     */
    public function markAsCompleted(): bool
    {
        return $this->update([
            'status' => self::STATUS_COMPLETED,
            'completed_at' => now(),
        ]);
    }

    /**
     * Check if deletion is due.
     */
    public function isDue(): bool
    {
        return $this->status === self::STATUS_PENDING
            && $this->scheduled_at->isPast();
    }

    /**
     * Check if user has a pending deletion request.
     */
    public static function hasPendingRequest(User $user): bool
    {
        return static::where('user_id', $user->id)
            ->whereIn('status', [self::STATUS_PENDING, self::STATUS_CONFIRMED])
            ->exists();
    }

    /**
     * Get the pending request for a user.
     */
    public static function getPendingRequest(User $user): ?self
    {
        return static::where('user_id', $user->id)
            ->whereIn('status', [self::STATUS_PENDING, self::STATUS_CONFIRMED])
            ->first();
    }

    /**
     * Find by cancellation token.
     */
    public static function findByCancellationToken(string $token): ?self
    {
        return static::where('cancellation_token', $token)->first();
    }
}
