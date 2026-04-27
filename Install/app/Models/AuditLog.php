<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasFactory;

    public const ACTION_DATA_EXPORT = 'data_export';

    public const ACTION_ACCOUNT_DELETION = 'account_deletion';

    public const ACTION_CONSENT_CHANGE = 'consent_change';

    public const ACTION_ADMIN_ACTION = 'admin_action';

    public const ACTION_DATA_ACCESS = 'data_access';

    public const ACTION_LOGIN = 'login';

    public const ACTION_LOGOUT = 'logout';

    protected $fillable = [
        'user_id',
        'actor_id',
        'action',
        'entity_type',
        'entity_id',
        'old_values',
        'new_values',
        'metadata',
        'ip_address',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'metadata' => 'array',
        ];
    }

    /**
     * The user affected by this action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The user who performed this action.
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /**
     * Create a new audit log entry.
     */
    public static function log(
        string $action,
        ?User $user = null,
        ?User $actor = null,
        ?string $entityType = null,
        ?int $entityId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?array $metadata = null
    ): self {
        return static::create([
            'user_id' => $user?->id,
            'actor_id' => $actor?->id ?? auth()->id(),
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'metadata' => $metadata,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
