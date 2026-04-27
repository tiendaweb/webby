<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuildCreditUsage extends Model
{
    use HasFactory;

    protected $table = 'build_credit_usage';

    protected $fillable = [
        'builder_event_id',
        'user_id',
        'project_id',
        'ai_provider_id',
        'model',
        'prompt_tokens',
        'completion_tokens',
        'total_tokens',
        'estimated_cost',
        'action',
        'used_own_api_key',
    ];

    protected $casts = [
        'prompt_tokens' => 'integer',
        'completion_tokens' => 'integer',
        'total_tokens' => 'integer',
        'estimated_cost' => 'decimal:6',
        'used_own_api_key' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function aiProvider(): BelongsTo
    {
        return $this->belongsTo(AiProvider::class);
    }

    /**
     * Get total tokens used by a user in the current month.
     */
    public static function getMonthlyUsageForUser(int $userId): int
    {
        return static::where('user_id', $userId)
            ->whereYear('created_at', now()->year)
            ->whereMonth('created_at', now()->month)
            ->sum('total_tokens');
    }

    /**
     * Get usage history for a user with pagination.
     */
    public static function getUsageHistoryForUser(int $userId, int $perPage = 15, string $period = 'current_month', ?bool $usedOwnApiKey = null)
    {
        $query = static::where('user_id', $userId)
            ->with(['project:id,name', 'aiProvider:id,name,type']);

        if ($usedOwnApiKey !== null) {
            $query->where('used_own_api_key', $usedOwnApiKey);
        }

        if ($period === 'current_month') {
            $query
                ->whereYear('created_at', now()->year)
                ->whereMonth('created_at', now()->month);
        }

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    /**
     * Get monthly stats for a user.
     */
    public static function getMonthlyStatsForUser(int $userId, ?bool $usedOwnApiKey = null): array
    {
        $query = static::where('user_id', $userId)
            ->whereYear('created_at', now()->year)
            ->whereMonth('created_at', now()->month);

        if ($usedOwnApiKey !== null) {
            $query->where('used_own_api_key', $usedOwnApiKey);
        }

        $stats = $query->selectRaw('
                SUM(total_tokens) as total_tokens,
                SUM(prompt_tokens) as prompt_tokens,
                SUM(completion_tokens) as completion_tokens,
                SUM(estimated_cost) as total_cost,
                COUNT(*) as request_count
            ')
            ->first();

        return [
            'total_tokens' => (int) ($stats->total_tokens ?? 0),
            'prompt_tokens' => (int) ($stats->prompt_tokens ?? 0),
            'completion_tokens' => (int) ($stats->completion_tokens ?? 0),
            'total_cost' => (float) ($stats->total_cost ?? 0),
            'request_count' => (int) ($stats->request_count ?? 0),
        ];
    }
}
