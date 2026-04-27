<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Storage;

class Template extends Model
{
    /** @use HasFactory<\Database\Factories\TemplateFactory> */
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'description',
        'thumbnail',
        'category',
        'keywords',
        'version',
        'is_system',
        'zip_path',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'is_system' => 'boolean',
            'metadata' => 'array',
            'keywords' => 'array',
        ];
    }

    /**
     * Get the plans this template is available for.
     */
    public function plans(): BelongsToMany
    {
        return $this->belongsToMany(Plan::class, 'plan_template');
    }

    /**
     * Scope to get templates available for a specific plan.
     * Includes system templates (always available) and plan-assigned templates.
     */
    public function scopeForPlan($query, ?Plan $plan)
    {
        return $query->where(function ($q) use ($plan) {
            // System templates are always available
            $q->where('is_system', true);

            // If a plan is provided, also include templates assigned to that plan
            if ($plan) {
                $q->orWhereHas('plans', function ($planQuery) use ($plan) {
                    $planQuery->where('plans.id', $plan->id);
                });
            }
        });
    }

    /**
     * Check if this template is available for a specific plan.
     */
    public function isAvailableForPlan(?Plan $plan): bool
    {
        // System templates are always available
        if ($this->is_system) {
            return true;
        }

        // No plan means only system templates are available
        if (! $plan) {
            return false;
        }

        // Check if this template is assigned to the plan
        return $this->plans()->where('plans.id', $plan->id)->exists();
    }

    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::deleting(function ($template) {
            if ($template->is_system) {
                throw new \Exception('System templates cannot be deleted.');
            }
        });
    }

    /**
     * Get the template's file path from storage.
     */
    public function getZipPathAttribute(?string $value): ?string
    {
        return $value ? Storage::disk('local')->path($value) : null;
    }

    /**
     * Scope a query to only include templates with a specific slug.
     */
    public function scopeWithSlug($query, string $slug)
    {
        return $query->where('slug', $slug);
    }
}
