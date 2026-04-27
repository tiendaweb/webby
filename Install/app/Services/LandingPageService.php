<?php

namespace App\Services;

use App\Models\LandingContent;
use App\Models\LandingItem;
use App\Models\LandingSection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class LandingPageService
{
    /**
     * Cache TTL in seconds (4 hours).
     */
    protected const CACHE_TTL = 14400;

    /**
     * Cache key prefix.
     */
    protected const CACHE_PREFIX = 'landing_page:';

    /**
     * Tracked locales for cache invalidation.
     */
    protected static array $cachedLocales = [];

    /**
     * Get the landing page configuration for the public landing page.
     * Only returns enabled sections.
     */
    public function getPageConfig(string $locale): array
    {
        $cacheKey = self::CACHE_PREFIX."config:{$locale}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($locale) {
            self::$cachedLocales[$locale] = true;

            $sections = LandingSection::enabled()
                ->ordered()
                ->get();

            return [
                'sections' => $sections->map(function (LandingSection $section) use ($locale) {
                    return $this->formatSectionForFrontend($section, $locale);
                })->values()->toArray(),
            ];
        });
    }

    /**
     * Get the preview configuration for the admin preview.
     * Includes all sections (enabled and disabled).
     */
    public function getPreviewConfig(string $locale): array
    {
        $sections = LandingSection::ordered()->get();

        return [
            'sections' => $sections->map(function (LandingSection $section) use ($locale) {
                return $this->formatSectionForFrontend($section, $locale);
            })->values()->toArray(),
        ];
    }

    /**
     * Get all sections for the admin interface.
     * Includes all locales' content and items.
     */
    public function getAllSectionsForAdmin(): array
    {
        $sections = LandingSection::ordered()
            ->with(['contents', 'items'])
            ->get();

        return $sections->map(function (LandingSection $section) {
            return $this->formatSectionForAdmin($section);
        })->values()->toArray();
    }

    /**
     * Get a section by its type.
     */
    public function getSectionByType(string $type): ?LandingSection
    {
        return LandingSection::where('type', $type)->first();
    }

    /**
     * Reorder sections based on provided IDs.
     */
    public function reorderSections(array $orderedIds): void
    {
        DB::transaction(function () use ($orderedIds) {
            foreach ($orderedIds as $index => $id) {
                LandingSection::where('id', $id)->update(['sort_order' => $index]);
            }
        });

        $this->clearCache();
    }

    /**
     * Update a section's settings and enabled status.
     */
    public function updateSection(int $sectionId, array $data): LandingSection
    {
        $section = LandingSection::findOrFail($sectionId);

        if (isset($data['is_enabled'])) {
            $section->is_enabled = $data['is_enabled'];
        }

        if (isset($data['settings'])) {
            $section->settings = $data['settings'];
        }

        $section->save();

        $this->clearCache();

        return $section;
    }

    /**
     * Update content fields for a section and locale.
     */
    public function updateContent(int $sectionId, string $locale, array $fields): void
    {
        DB::transaction(function () use ($sectionId, $locale, $fields) {
            foreach ($fields as $field => $value) {
                LandingContent::updateOrCreate(
                    [
                        'section_id' => $sectionId,
                        'locale' => $locale,
                        'field' => $field,
                    ],
                    [
                        'value' => $value,
                    ]
                );
            }
        });

        $this->clearCache();
    }

    /**
     * Update items for a section and locale.
     * This syncs items - creates new, updates existing, removes deleted.
     */
    public function updateItems(int $sectionId, string $locale, array $items): void
    {
        DB::transaction(function () use ($sectionId, $locale, $items) {
            $existingKeys = [];

            foreach ($items as $item) {
                $existingKeys[] = $item['key'];

                LandingItem::updateOrCreate(
                    [
                        'section_id' => $sectionId,
                        'locale' => $locale,
                        'item_key' => $item['key'],
                    ],
                    [
                        'sort_order' => $item['sort_order'],
                        'is_enabled' => $item['is_enabled'] ?? true,
                        'data' => $item['data'],
                    ]
                );
            }

            // Delete items that are no longer in the list
            LandingItem::where('section_id', $sectionId)
                ->where('locale', $locale)
                ->whereNotIn('item_key', $existingKeys)
                ->delete();
        });

        $this->clearCache();
    }

    /**
     * Clone content from one locale to another.
     */
    public function cloneDefaultContent(int $sectionId, string $fromLocale, string $toLocale): void
    {
        DB::transaction(function () use ($sectionId, $fromLocale, $toLocale) {
            $sourceContent = LandingContent::where('section_id', $sectionId)
                ->where('locale', $fromLocale)
                ->get();

            foreach ($sourceContent as $content) {
                LandingContent::updateOrCreate(
                    [
                        'section_id' => $sectionId,
                        'locale' => $toLocale,
                        'field' => $content->field,
                    ],
                    [
                        'value' => $content->getRawOriginal('value'),
                    ]
                );
            }
        });

        $this->clearCache();
    }

    /**
     * Clear all landing page caches.
     */
    public function clearCache(): void
    {
        // Clear known cached locales
        foreach (array_keys(self::$cachedLocales) as $locale) {
            Cache::forget(self::CACHE_PREFIX."config:{$locale}");
        }

        // Also try common locales
        $commonLocales = ['en', 'ar', 'de', 'fr', 'ja', 'ru', 'es', 'zh'];
        foreach ($commonLocales as $locale) {
            Cache::forget(self::CACHE_PREFIX."config:{$locale}");
        }

        self::$cachedLocales = [];
    }

    /**
     * Get section types with their configuration.
     */
    public function getSectionTypes(): array
    {
        return LandingSection::getSectionTypes();
    }

    /**
     * Format a section for frontend display.
     */
    protected function formatSectionForFrontend(LandingSection $section, string $locale): array
    {
        $content = $section->getContentForLocale($locale);
        $items = $section->getItemsForLocale($locale);

        // Items from getItemsForLocale already have data merged, just filter out the key/sort_order
        $formattedItems = array_map(function ($item) {
            unset($item['key'], $item['sort_order']);

            return $item;
        }, $items);

        return [
            'type' => $section->type,
            'is_enabled' => $section->is_enabled,
            'settings' => $section->settings ?? [],
            'content' => $content,
            'items' => $formattedItems,
        ];
    }

    /**
     * Format a section for the admin interface.
     * Includes all locales' content and items.
     */
    protected function formatSectionForAdmin(LandingSection $section): array
    {
        // Group content by locale
        $contentByLocale = [];
        foreach ($section->contents as $content) {
            if (! isset($contentByLocale[$content->locale])) {
                $contentByLocale[$content->locale] = [];
            }
            $contentByLocale[$content->locale][$content->field] = $content->value;
        }

        // Group items by locale
        $itemsByLocale = [];
        foreach ($section->items as $item) {
            if (! isset($itemsByLocale[$item->locale])) {
                $itemsByLocale[$item->locale] = [];
            }
            $itemsByLocale[$item->locale][] = [
                'id' => $item->id,
                'key' => $item->item_key,
                'sort_order' => $item->sort_order,
                'is_enabled' => $item->is_enabled,
                'data' => $item->data,
            ];
        }

        // Sort items by sort_order within each locale
        foreach ($itemsByLocale as $locale => $items) {
            usort($itemsByLocale[$locale], fn ($a, $b) => $a['sort_order'] <=> $b['sort_order']);
        }

        return [
            'id' => $section->id,
            'type' => $section->type,
            'sort_order' => $section->sort_order,
            'is_enabled' => $section->is_enabled,
            'settings' => $section->settings ?? [],
            'content' => $contentByLocale,
            'items' => $itemsByLocale,
        ];
    }
}
