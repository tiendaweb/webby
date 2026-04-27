<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LandingItem extends Model
{
    protected $fillable = [
        'section_id',
        'locale',
        'item_key',
        'sort_order',
        'is_enabled',
        'data',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'data' => 'array',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(LandingSection::class, 'section_id');
    }

    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order');
    }
}
