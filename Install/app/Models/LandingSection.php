<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LandingSection extends Model
{
    protected $fillable = [
        'type',
        'sort_order',
        'is_enabled',
        'settings',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'settings' => 'array',
    ];

    // Relationships
    public function contents(): HasMany
    {
        return $this->hasMany(LandingContent::class, 'section_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(LandingItem::class, 'section_id');
    }

    // Scopes
    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order');
    }

    /**
     * Get content for a specific locale with fallback to English.
     */
    public function getContentForLocale(string $locale, string $fallback = 'en'): array
    {
        $contents = $this->contents()
            ->whereIn('locale', [$locale, $fallback])
            ->get()
            ->groupBy('locale');

        $result = [];

        // Start with fallback values
        foreach ($contents->get($fallback, collect()) as $content) {
            $result[$content->field] = $content->value;
        }

        // Override with locale-specific values
        foreach ($contents->get($locale, collect()) as $content) {
            $result[$content->field] = $content->value;
        }

        return $result;
    }

    /**
     * Get items for a specific locale with fallback to English.
     */
    public function getItemsForLocale(string $locale, string $fallback = 'en'): array
    {
        $items = $this->items()
            ->where('locale', $locale)
            ->where('is_enabled', true)
            ->orderBy('sort_order')
            ->get();

        // Fallback to English if no items for locale
        if ($items->isEmpty() && $locale !== $fallback) {
            $items = $this->items()
                ->where('locale', $fallback)
                ->where('is_enabled', true)
                ->orderBy('sort_order')
                ->get();
        }

        return $items->map(fn ($item) => array_merge(
            ['key' => $item->item_key, 'sort_order' => $item->sort_order],
            $item->data
        ))->toArray();
    }

    /**
     * Get a setting value using dot notation.
     */
    public function getSetting(string $key, mixed $default = null): mixed
    {
        return data_get($this->settings, $key, $default);
    }

    /**
     * Get all section type definitions.
     */
    public static function getSectionTypes(): array
    {
        return [
            'hero' => [
                'name' => __('Hero Section'),
                'icon' => 'Sparkles',
                'description' => __('Main hero with headlines, typing animation, CTA, and trusted by logos'),
                'has_items' => true,
                'item_type' => 'logo',
                'content_fields' => ['headlines', 'subtitles', 'typing_prompts', 'suggestions', 'cta_button', 'trusted_by_title'],
            ],
            'social_proof' => [
                'name' => __('Social Proof'),
                'icon' => 'Users',
                'description' => __('Statistics and trust indicators'),
                'has_items' => false,
                'content_fields' => ['users_label', 'projects_label', 'uptime_label', 'uptime_value'],
            ],
            'features' => [
                'name' => __('Features'),
                'icon' => 'LayoutGrid',
                'description' => __('Feature grid with icons'),
                'has_items' => true,
                'item_type' => 'feature',
                'content_fields' => ['title', 'subtitle'],
            ],
            'product_showcase' => [
                'name' => __('Product Showcase'),
                'icon' => 'Monitor',
                'description' => __('Product demo video or tabbed screenshots'),
                'has_items' => true,
                'item_type' => 'showcase_tab',
                'content_fields' => ['title', 'subtitle', 'video_url'],
            ],
            'use_cases' => [
                'name' => __('Use Cases'),
                'icon' => 'Users',
                'description' => __('Target user personas'),
                'has_items' => true,
                'item_type' => 'persona',
                'content_fields' => ['title', 'subtitle'],
            ],
            'pricing' => [
                'name' => __('Pricing'),
                'icon' => 'CreditCard',
                'description' => __('Pricing plans (from Plans table)'),
                'has_items' => false,
                'content_fields' => ['title', 'subtitle'],
            ],
            'categories' => [
                'name' => __('Categories'),
                'icon' => 'Grid3X3',
                'description' => __('Project category gallery'),
                'has_items' => true,
                'item_type' => 'category',
                'content_fields' => ['title', 'subtitle'],
            ],
            'trusted_by' => [
                'name' => __('Trusted By'),
                'icon' => 'Building2',
                'description' => __('Company logos and trust indicators'),
                'has_items' => true,
                'item_type' => 'company',
                'content_fields' => ['title'],
            ],
            'testimonials' => [
                'name' => __('Testimonials'),
                'icon' => 'MessageSquareQuote',
                'description' => __('Customer testimonials with ratings'),
                'has_items' => true,
                'item_type' => 'testimonial',
                'content_fields' => ['title', 'subtitle'],
            ],
            'faq' => [
                'name' => __('FAQ'),
                'icon' => 'HelpCircle',
                'description' => __('Frequently asked questions'),
                'has_items' => true,
                'item_type' => 'faq',
                'content_fields' => ['title', 'subtitle'],
            ],
            'cta' => [
                'name' => __('Call to Action'),
                'icon' => 'MousePointerClick',
                'description' => __('Secondary CTA section'),
                'has_items' => false,
                'content_fields' => ['title', 'subtitle', 'button_text', 'button_url'],
            ],
        ];
    }
}
