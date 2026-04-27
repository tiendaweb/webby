<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserNotification extends Model
{
    use HasFactory;

    // Notification types
    const TYPE_BUILD_COMPLETE = 'build_complete';

    const TYPE_BUILD_FAILED = 'build_failed';

    const TYPE_CREDITS_LOW = 'credits_low';

    const TYPE_SUBSCRIPTION_RENEWED = 'subscription_renewed';

    const TYPE_SUBSCRIPTION_EXPIRED = 'subscription_expired';

    const TYPE_PAYMENT_COMPLETED = 'payment_completed';

    const TYPE_DOMAIN_VERIFIED = 'domain_verified';

    const TYPE_SSL_PROVISIONED = 'ssl_provisioned';

    const TYPE_PROJECT_STATUS = 'project_status';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'data',
        'action_url',
        'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
    ];

    /**
     * Get the user that owns the notification.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Mark the notification as read.
     */
    public function markAsRead(): void
    {
        if (is_null($this->read_at)) {
            $this->update(['read_at' => now()]);
        }
    }

    /**
     * Scope to filter only unread notifications.
     */
    public function scopeUnread($query)
    {
        return $query->whereNull('read_at');
    }

    /**
     * Scope to filter only read notifications.
     */
    public function scopeRead($query)
    {
        return $query->whereNotNull('read_at');
    }
}
