<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class Language extends Model
{
    protected $fillable = [
        'code',
        'country_code',
        'name',
        'native_name',
        'is_rtl',
        'is_active',
        'is_default',
        'sort_order',
    ];

    protected $casts = [
        'is_rtl' => 'boolean',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Scope to get only active languages.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get the default language.
     */
    public function scopeDefault(Builder $query): Builder
    {
        return $query->where('is_default', true);
    }

    /**
     * Get the default language.
     */
    public static function getDefault(): ?self
    {
        return static::where('is_default', true)->first();
    }

    /**
     * Get all active languages ordered by sort_order.
     */
    public static function getActiveLanguages(): Collection
    {
        return static::active()->orderBy('sort_order')->get();
    }

    /**
     * Check if a language code is valid and active.
     */
    public static function isValidCode(string $code): bool
    {
        return static::where('code', $code)->where('is_active', true)->exists();
    }
}
