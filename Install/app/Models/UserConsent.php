<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserConsent extends Model
{
    use HasFactory;

    public const TYPE_MARKETING = 'marketing';

    public const TYPE_ANALYTICS = 'analytics';

    public const TYPE_THIRD_PARTY = 'third_party';

    public const TYPE_PRIVACY_POLICY = 'privacy_policy';

    public const TYPE_TERMS = 'terms';

    public const TYPE_COOKIES = 'cookies';

    protected $fillable = [
        'user_id',
        'consent_type',
        'consented',
        'version',
        'ip_address',
        'user_agent',
        'consented_at',
        'withdrawn_at',
    ];

    protected function casts(): array
    {
        return [
            'consented' => 'boolean',
            'consented_at' => 'datetime',
            'withdrawn_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Record consent for a user.
     */
    public static function recordConsent(
        User $user,
        string $type,
        bool $consented,
        ?string $version = null
    ): self {
        return static::updateOrCreate(
            [
                'user_id' => $user->id,
                'consent_type' => $type,
            ],
            [
                'consented' => $consented,
                'version' => $version,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'consented_at' => $consented ? now() : null,
                'withdrawn_at' => ! $consented ? now() : null,
            ]
        );
    }

    /**
     * Check if user has consented to a specific type.
     */
    public static function hasConsented(User $user, string $type): bool
    {
        return static::where('user_id', $user->id)
            ->where('consent_type', $type)
            ->where('consented', true)
            ->exists();
    }

    /**
     * Get all consent types.
     */
    public static function getTypes(): array
    {
        return [
            self::TYPE_MARKETING => 'Marketing communications',
            self::TYPE_ANALYTICS => 'Analytics and improvements',
            self::TYPE_THIRD_PARTY => 'Third-party data sharing',
            self::TYPE_PRIVACY_POLICY => 'Privacy policy acceptance',
            self::TYPE_TERMS => 'Terms of service acceptance',
            self::TYPE_COOKIES => 'Cookie consent',
        ];
    }
}
