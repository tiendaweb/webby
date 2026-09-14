<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Per-project entitlement record for an AiConnectorModule. Mirrors
 * Subscription's status/date fields but is scoped by project_id rather
 * than being a per-user singleton — a project can only have one activation
 * per module at a time (see the unique index on the migration).
 */
class ProjectAiConnectorActivation extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_PENDING = 'pending';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'project_id',
        'ai_connector_module_id',
        'user_id',
        'status',
        'amount',
        'payment_method',
        'external_subscription_id',
        'starts_at',
        'renewal_at',
        'ends_at',
        'cancelled_at',
        'approved_by',
        'approved_at',
        'admin_notes',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'starts_at' => 'datetime',
            'renewal_at' => 'datetime',
            'ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'approved_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(AiConnectorModule::class, 'ai_connector_module_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function tokens(): HasMany
    {
        return $this->hasMany(ProjectAiConnectorToken::class, 'ai_connector_activation_id');
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE
            && (! $this->ends_at || $this->ends_at->isFuture());
    }

    public function requiresApproval(): bool
    {
        return $this->payment_method === 'bank_transfer'
            && $this->status === self::STATUS_PENDING
            && $this->approved_at === null;
    }

    /**
     * Approve a pending bank-transfer purchase. Mirrors Subscription::approve().
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

        return true;
    }

    public function reject(User $admin, ?string $reason = null): bool
    {
        $this->update([
            'status' => self::STATUS_CANCELLED,
            'approved_by' => $admin->id,
            'admin_notes' => $reason,
            'cancelled_at' => now(),
        ]);

        return true;
    }

    /**
     * Calculate the next renewal date from the linked module's pricing_type.
     * Mirrors Subscription::calculateNextRenewal().
     */
    public function calculateNextRenewal(): ?\Carbon\Carbon
    {
        return match ($this->module?->pricing_type) {
            AiConnectorModule::PRICING_YEARLY => now()->addYear(),
            AiConnectorModule::PRICING_ONE_TIME => null,
            default => now()->addMonth(),
        };
    }
}
