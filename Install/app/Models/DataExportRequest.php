<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class DataExportRequest extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    public const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'user_id',
        'status',
        'file_path',
        'file_size',
        'download_token',
        'expires_at',
        'completed_at',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Create a new export request for a user.
     */
    public static function createForUser(User $user): self
    {
        $expiresInDays = SystemSetting::get('data_retention_days_exports', 7);

        return static::create([
            'user_id' => $user->id,
            'status' => self::STATUS_PENDING,
            'download_token' => Str::random(64),
            'expires_at' => now()->addDays($expiresInDays),
        ]);
    }

    /**
     * Mark as processing.
     */
    public function markAsProcessing(): bool
    {
        return $this->update(['status' => self::STATUS_PROCESSING]);
    }

    /**
     * Mark as completed.
     */
    public function markAsCompleted(string $filePath, ?int $fileSize = null): bool
    {
        if ($fileSize === null && file_exists($filePath)) {
            $fileSize = filesize($filePath);
        }

        return $this->update([
            'status' => self::STATUS_COMPLETED,
            'file_path' => $filePath,
            'file_size' => $fileSize,
            'completed_at' => now(),
        ]);
    }

    /**
     * Mark as failed.
     */
    public function markAsFailed(string $error): bool
    {
        return $this->update([
            'status' => self::STATUS_FAILED,
            'error_message' => $error,
        ]);
    }

    /**
     * Check if the export is expired.
     */
    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    /**
     * Check if the export is downloadable.
     */
    public function isDownloadable(): bool
    {
        return $this->status === self::STATUS_COMPLETED
            && ! $this->isExpired()
            && $this->file_path;
    }

    /**
     * Check if user can request a new export (rate limiting).
     */
    public static function canUserRequestExport(User $user): bool
    {
        $rateLimitHours = SystemSetting::get('data_export_rate_limit_hours', 24);

        $recentRequest = static::where('user_id', $user->id)
            ->where('created_at', '>=', now()->subHours($rateLimitHours))
            ->exists();

        return ! $recentRequest;
    }

    /**
     * Get hours until user can request another export.
     */
    public static function hoursUntilNextExport(User $user): int
    {
        $rateLimitHours = SystemSetting::get('data_export_rate_limit_hours', 24);

        $lastRequest = static::where('user_id', $user->id)
            ->latest()
            ->first();

        if (! $lastRequest) {
            return 0;
        }

        $nextAllowed = $lastRequest->created_at->addHours($rateLimitHours);

        if ($nextAllowed->isPast()) {
            return 0;
        }

        return (int) now()->diffInHours($nextAllowed, false);
    }
}
