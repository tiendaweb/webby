<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LandingPage extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'type',
        'is_home',
        'is_active',
        'meta_title',
        'meta_description',
        'settings',
    ];

    protected $casts = [
        'is_home'   => 'boolean',
        'is_active' => 'boolean',
        'settings'  => 'array',
    ];

    public function isHtmlCode(): bool
    {
        return $this->type === 'html_code';
    }

    public function sections(): HasMany
    {
        return $this->hasMany(LandingSection::class, 'landing_page_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Reserved slugs that cannot be used for landing pages.
     */
    public static function reservedSlugs(): array
    {
        return [
            'admin', 'login', 'register', 'logout', 'password',
            'create', 'projects', 'profile', 'billing', 'preview',
            'app', 'api', 'privacy', 'terms', 'cookies', 'install',
            'upgrade', 'builder', 'database', 'firebase', 'file-manager',
            'referral', 'r', 'locale', 'payment', 'landing',
            'notification', 'cookie-consent', 'data-export', 'account',
            'impersonate', 'documentation',
        ];
    }

    public static function isReservedSlug(string $slug): bool
    {
        return in_array(strtolower($slug), self::reservedSlugs(), true);
    }
}
