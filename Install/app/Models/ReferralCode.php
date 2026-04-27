<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ReferralCode extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'code',
        'slug',
        'is_active',
        'total_clicks',
        'total_signups',
        'total_conversions',
        'total_earnings',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'total_clicks' => 'integer',
            'total_signups' => 'integer',
            'total_conversions' => 'integer',
            'total_earnings' => 'decimal:2',
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->code)) {
                $model->code = self::generateUniqueCode();
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

    public function referrals(): HasMany
    {
        return $this->hasMany(Referral::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    /**
     * Generate a unique referral code.
     */
    public static function generateUniqueCode(): string
    {
        do {
            $code = strtoupper(Str::random(10));
        } while (self::where('code', $code)->exists());

        return $code;
    }

    /**
     * Get the shareable URL for this referral code.
     */
    public function getShareUrl(): string
    {
        return url('/r/'.$this->code);
    }

    /**
     * Increment the click counter.
     */
    public function incrementClicks(): void
    {
        $this->increment('total_clicks');
    }

    /**
     * Increment the signup counter.
     */
    public function incrementSignups(): void
    {
        $this->increment('total_signups');
    }

    /**
     * Record a successful conversion.
     */
    public function recordConversion(float $amount): void
    {
        $this->increment('total_conversions');
        $this->increment('total_earnings', $amount);
    }
}
