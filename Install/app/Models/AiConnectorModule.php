<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Admin-configurable catalog entry for a sellable per-project module
 * (e.g. "Conector IA"). See database/seeders/AiConnectorModuleSeeder.php
 * for the default row.
 */
class AiConnectorModule extends Model
{
    use HasFactory;

    public const PRICING_ONE_TIME = 'one_time';

    public const PRICING_MONTHLY = 'monthly';

    public const PRICING_YEARLY = 'yearly';

    public const SLUG_AI_CONNECTOR = 'ai-connector';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'pricing_type',
        'price',
        'is_active',
        'tool_scope',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'is_active' => 'boolean',
            'tool_scope' => 'array',
            'sort_order' => 'integer',
        ];
    }

    public function activations(): HasMany
    {
        return $this->hasMany(ProjectAiConnectorActivation::class);
    }

    public function isRecurring(): bool
    {
        return in_array($this->pricing_type, [self::PRICING_MONTHLY, self::PRICING_YEARLY], true);
    }

    public static function getPricingTypes(): array
    {
        return [self::PRICING_ONE_TIME, self::PRICING_MONTHLY, self::PRICING_YEARLY];
    }
}
