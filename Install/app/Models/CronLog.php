<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CronLog extends Model
{
    use HasFactory;

    public const STATUS_RUNNING = 'running';

    public const STATUS_SUCCESS = 'success';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'job_name',
        'job_class',
        'status',
        'started_at',
        'completed_at',
        'duration',
        'triggered_by',
        'message',
        'exception',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'duration' => 'integer',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    /**
     * Scope to recent logs (last 7 days by default).
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('started_at', '>=', now()->subDays($days));
    }

    /**
     * Scope to failed logs only.
     */
    public function scopeFailed($query)
    {
        return $query->where('status', self::STATUS_FAILED);
    }

    /**
     * Scope to successful logs only.
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status', self::STATUS_SUCCESS);
    }

    /**
     * Scope to running logs only.
     */
    public function scopeRunning($query)
    {
        return $query->where('status', self::STATUS_RUNNING);
    }

    /**
     * Scope to logs by job name.
     */
    public function scopeByJob($query, string $jobName)
    {
        return $query->where('job_name', $jobName);
    }

    /**
     * Scope to exclude pruning logs (to avoid counting self-pruning).
     */
    public function scopeExcludePruning($query)
    {
        return $query->where('job_name', '!=', 'Prune Cron Logs');
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    /**
     * Get human-readable duration.
     */
    public function getHumanDurationAttribute(): string
    {
        if ($this->duration === null) {
            return '-';
        }

        if ($this->duration < 60) {
            return $this->duration.'s';
        }

        $minutes = floor($this->duration / 60);
        $seconds = $this->duration % 60;

        if ($minutes < 60) {
            return "{$minutes}m {$seconds}s";
        }

        $hours = floor($minutes / 60);
        $minutes = $minutes % 60;

        return "{$hours}h {$minutes}m";
    }

    /**
     * Check if log was triggered manually.
     */
    public function wasTriggeredManually(): bool
    {
        return str_starts_with($this->triggered_by, 'manual:');
    }

    /**
     * Get trigger display text.
     */
    public function getTriggerDisplayAttribute(): string
    {
        if ($this->triggered_by === 'cron') {
            return 'Scheduled';
        }

        if (str_starts_with($this->triggered_by, 'manual:')) {
            $userId = str_replace('manual:', '', $this->triggered_by);

            return "Manual (User #{$userId})";
        }

        return $this->triggered_by;
    }

    /**
     * Prune old logs.
     */
    public static function pruneOld(int $days = 30): int
    {
        return static::where('created_at', '<', now()->subDays($days))->delete();
    }

    /**
     * Get the latest successful run for a job.
     */
    public static function latestSuccessfulRun(string $jobName): ?self
    {
        return static::byJob($jobName)
            ->successful()
            ->latest('started_at')
            ->first();
    }

    /**
     * Get the latest run for a job (any status).
     */
    public static function latestRun(string $jobName): ?self
    {
        return static::byJob($jobName)
            ->latest('started_at')
            ->first();
    }

    /**
     * Get all available statuses.
     */
    public static function getStatuses(): array
    {
        return [
            self::STATUS_RUNNING,
            self::STATUS_SUCCESS,
            self::STATUS_FAILED,
        ];
    }

    /**
     * Mark the log as completed with success.
     */
    public function markSuccess(?string $message = null): void
    {
        $this->update([
            'status' => self::STATUS_SUCCESS,
            'completed_at' => now(),
            'duration' => $this->started_at->diffInSeconds(now()),
            'message' => $message,
        ]);
    }

    /**
     * Mark the log as completed with failure.
     */
    public function markFailed(?string $exception = null, ?string $message = null): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'completed_at' => now(),
            'duration' => $this->started_at->diffInSeconds(now()),
            'exception' => $exception,
            'message' => $message,
        ]);
    }

    /**
     * Create a new running log entry.
     */
    public static function startLog(string $jobName, string $jobClass, string $triggeredBy = 'cron'): self
    {
        return static::create([
            'job_name' => $jobName,
            'job_class' => $jobClass,
            'status' => self::STATUS_RUNNING,
            'started_at' => now(),
            'triggered_by' => $triggeredBy,
        ]);
    }
}
