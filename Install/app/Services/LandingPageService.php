<?php

namespace App\Services;

use App\Models\LandingContent;
use App\Models\LandingItem;
use App\Models\LandingPage;
use App\Models\LandingSection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LandingPageService
{
    protected const CACHE_TTL = 14400; // 4 hours
    protected const CACHE_PREFIX = 'landing_page:';
    protected static array $cachedLocales = [];

    // ─────────────────────────────────────────────────────────────
    // Page management
    // ─────────────────────────────────────────────────────────────

    public function getAllPagesForAdmin(): array
    {
        return LandingPage::orderBy('is_home', 'desc')
            ->orderBy('name')
            ->withCount('sections')
            ->get()
            ->toArray();
    }

    public function createPage(array $data): LandingPage
    {
        $page = LandingPage::create([
            'name'             => $data['name'],
            'slug'             => $data['slug'],
            'type'             => $data['type'] ?? 'sections',
            'is_home'          => false,
            'is_active'        => $data['is_active'] ?? true,
            'meta_title'       => $data['meta_title'] ?? null,
            'meta_description' => $data['meta_description'] ?? null,
            'settings'         => $data['settings'] ?? null,
        ]);

        if (! empty($data['is_home'])) {
            $this->setAsHome($page->id);
        }

        if (($data['type'] ?? 'sections') !== 'html_code' && ! empty($data['preset'])) {
            $this->applyPagePreset($page->id, (string) $data['preset']);
        }

        return $page;
    }

    public function updatePage(int $pageId, array $data): LandingPage
    {
        $page = LandingPage::findOrFail($pageId);

        $page->update([
            'name'             => $data['name'] ?? $page->name,
            'slug'             => $data['slug'] ?? $page->slug,
            'is_active'        => $data['is_active'] ?? $page->is_active,
            'meta_title'       => $data['meta_title'] ?? $page->meta_title,
            'meta_description' => $data['meta_description'] ?? $page->meta_description,
            'settings'         => $data['settings'] ?? $page->settings,
        ]);


        if (! empty($data['is_home'])) {
            $this->setAsHome($page->id);
        }

        $this->clearCacheForPage($pageId);

        return $page->fresh();
    }

    public function deletePage(int $pageId): void
    {
        $page = LandingPage::findOrFail($pageId);

        if ($page->is_home) {
            throw new \RuntimeException('Cannot delete the home landing page.');
        }

        $htmlDir = storage_path("app/private/landing-pages/{$pageId}");
        if (is_dir($htmlDir)) {
            array_map('unlink', glob("{$htmlDir}/*"));
            rmdir($htmlDir);
        }

        $page->delete();
        $this->clearCacheForPage($pageId);
    }

    public function setAsHome(int $pageId): void
    {
        DB::transaction(function () use ($pageId) {
            LandingPage::where('is_home', true)->update(['is_home' => false]);
            LandingPage::where('id', $pageId)->update(['is_home' => true]);
        });

        $this->clearCache();
    }

    public function toggleActive(int $pageId): LandingPage
    {
        $page = LandingPage::findOrFail($pageId);
        $page->is_active = ! $page->is_active;
        $page->save();
        $this->clearCacheForPage($pageId);

        return $page;
    }

    /**
     * Available starter presets for section-based pages.
     */
    public function getPagePresets(): array
    {
        return [
            'saas' => ['label' => 'SaaS', 'description' => __('Hero, social proof, features, showcase, pricing, FAQ and CTA.')],
            'ecommerce' => ['label' => 'E-commerce', 'description' => __('Hero, features, categories, showcase, pricing, testimonials and CTA.')],
            'dashboard' => ['label' => 'Dashboard', 'description' => __('Hero, social proof, features, showcase, FAQ and CTA.')],
            'portfolio' => ['label' => 'Portfolio', 'description' => __('Hero, features, categories, testimonials and CTA.')],
            'restaurant' => ['label' => 'Restaurant', 'description' => __('Hero, categories, showcase, testimonials, FAQ and CTA.')],
            'cms' => ['label' => 'CMS / Blog', 'description' => __('Hero, social proof, features, testimonials, FAQ and CTA.')],
            'default' => ['label' => __('Default'), 'description' => __('A balanced starter layout for general websites.')],
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // Public page config (keyed by page)
    // ─────────────────────────────────────────────────────────────

    /**
     * Get the home landing page config (active, is_home = true).
     */
    public function getHomePageConfig(string $locale): array
    {
        $page = LandingPage::where('is_home', true)->where('is_active', true)->first();

        if (! $page) {
            return ['sections' => []];
        }

        return $this->getPageConfig($page, $locale);
    }

    /**
     * Get config by slug.
     */
    public function getPageConfigBySlug(string $slug, string $locale): ?array
    {
        $page = LandingPage::where('slug', $slug)->where('is_active', true)->first();

        if (! $page) {
            return null;
        }

        return $this->getPageConfig($page, $locale);
    }

    /**
     * Get config for a specific page object (cached).
     */
    public function getPageConfig(LandingPage $page, string $locale): array
    {
        $cacheKey = self::CACHE_PREFIX."page:{$page->id}:{$locale}";

        return Cache::remember($cacheKey, self::CACHE_TTL, function () use ($page, $locale) {
            self::$cachedLocales[$locale] = true;

            $sections = LandingSection::where('landing_page_id', $page->id)
                ->where('is_enabled', true)
                ->orderBy('sort_order')
                ->get();

            return [
                'page'     => [
                    'id'               => $page->id,
                    'name'             => $page->name,
                    'slug'             => $page->slug,
                    'meta_title'       => $page->meta_title,
                    'meta_description' => $page->meta_description,
                ],
                'sections' => $sections->map(fn ($s) => $this->formatSectionForFrontend($s, $locale))->values()->toArray(),
            ];
        });
    }

    /**
     * Get preview config for a page (all sections, no cache).
     */
    public function getPreviewConfig(string $locale, ?int $pageId = null): array
    {
        if ($pageId) {
            $page = LandingPage::findOrFail($pageId);
        } else {
            $page = LandingPage::where('is_home', true)->first()
                ?? LandingPage::first();
        }

        if (! $page) {
            return ['sections' => []];
        }

        $sections = LandingSection::where('landing_page_id', $page->id)
            ->orderBy('sort_order')
            ->get();

        return [
            'page'     => [
                'id'               => $page->id,
                'name'             => $page->name,
                'slug'             => $page->slug,
                'meta_title'       => $page->meta_title,
                'meta_description' => $page->meta_description,
            ],
            'sections' => $sections->map(fn ($s) => $this->formatSectionForFrontend($s, $locale))->values()->toArray(),
        ];
    }

    // ─────────────────────────────────────────────────────────────
    // Admin: sections for a specific page
    // ─────────────────────────────────────────────────────────────

    public function getAllSectionsForAdmin(?int $pageId = null): array
    {
        $query = LandingSection::ordered()->with(['contents', 'items']);

        if ($pageId !== null) {
            $query->where('landing_page_id', $pageId);
        }

        return $query->get()->map(fn ($s) => $this->formatSectionForAdmin($s))->values()->toArray();
    }

    public function getSectionByType(string $type, ?int $pageId = null): ?LandingSection
    {
        $query = LandingSection::where('type', $type);

        if ($pageId !== null) {
            $query->where('landing_page_id', $pageId);
        }

        return $query->first();
    }

    // ─────────────────────────────────────────────────────────────
    // Section operations (unchanged, work within a page)
    // ─────────────────────────────────────────────────────────────

    public function reorderSections(array $orderedIds): void
    {
        DB::transaction(function () use ($orderedIds) {
            foreach ($orderedIds as $index => $id) {
                LandingSection::where('id', $id)->update(['sort_order' => $index]);
            }
        });

        $this->clearCache();
    }

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
        $this->clearCacheForPage($section->landing_page_id);

        return $section;
    }

    public function updateContent(int $sectionId, string $locale, array $fields): void
    {
        $section = LandingSection::findOrFail($sectionId);

        DB::transaction(function () use ($sectionId, $locale, $fields) {
            foreach ($fields as $field => $value) {
                LandingContent::updateOrCreate(
                    ['section_id' => $sectionId, 'locale' => $locale, 'field' => $field],
                    ['value' => $value]
                );
            }
        });

        $this->clearCacheForPage($section->landing_page_id);
    }

    public function updateItems(int $sectionId, string $locale, array $items): void
    {
        $section = LandingSection::findOrFail($sectionId);

        DB::transaction(function () use ($sectionId, $locale, $items) {
            $existingKeys = [];

            foreach ($items as $item) {
                $existingKeys[] = $item['key'];

                LandingItem::updateOrCreate(
                    ['section_id' => $sectionId, 'locale' => $locale, 'item_key' => $item['key']],
                    [
                        'sort_order' => $item['sort_order'],
                        'is_enabled' => $item['is_enabled'] ?? true,
                        'data'       => $item['data'],
                    ]
                );
            }

            LandingItem::where('section_id', $sectionId)
                ->where('locale', $locale)
                ->whereNotIn('item_key', $existingKeys)
                ->delete();
        });

        $this->clearCacheForPage($section->landing_page_id);
    }

    public function cloneDefaultContent(int $sectionId, string $fromLocale, string $toLocale): void
    {
        $section = LandingSection::findOrFail($sectionId);

        DB::transaction(function () use ($sectionId, $fromLocale, $toLocale) {
            $sourceContent = LandingContent::where('section_id', $sectionId)
                ->where('locale', $fromLocale)
                ->get();

            foreach ($sourceContent as $content) {
                LandingContent::updateOrCreate(
                    ['section_id' => $sectionId, 'locale' => $toLocale, 'field' => $content->field],
                    ['value' => $content->getRawOriginal('value')]
                );
            }
        });

        $this->clearCacheForPage($section->landing_page_id);
    }

    public function addHtmlBlock(int $pageId): LandingSection
    {
        $maxOrder = LandingSection::where('landing_page_id', $pageId)->max('sort_order') ?? -1;

        return LandingSection::create([
            'landing_page_id' => $pageId,
            'type'            => 'html_block',
            'sort_order'      => $maxOrder + 1,
            'is_enabled'      => true,
            'settings'        => null,
        ]);
    }

    public function deleteSection(int $sectionId): void
    {
        $section = LandingSection::findOrFail($sectionId);
        $pageId  = $section->landing_page_id;
        $section->delete();
        $this->clearCacheForPage($pageId);
    }

    public function applyPagePreset(int $pageId, string $preset): void
    {
        $sectionTypes = match ($preset) {
            'saas' => ['hero', 'social_proof', 'features', 'product_showcase', 'pricing', 'testimonials', 'faq', 'cta'],
            'ecommerce' => ['hero', 'features', 'categories', 'product_showcase', 'pricing', 'testimonials', 'faq', 'cta'],
            'dashboard' => ['hero', 'social_proof', 'features', 'product_showcase', 'faq', 'cta'],
            'portfolio' => ['hero', 'features', 'categories', 'testimonials', 'cta'],
            'restaurant' => ['hero', 'categories', 'product_showcase', 'testimonials', 'faq', 'cta'],
            'cms' => ['hero', 'social_proof', 'features', 'testimonials', 'faq', 'cta'],
            default => ['hero', 'social_proof', 'features', 'pricing', 'faq', 'cta'],
        };

        DB::transaction(function () use ($pageId, $sectionTypes) {
            LandingSection::where('landing_page_id', $pageId)->delete();

            foreach ($sectionTypes as $index => $type) {
                $section = LandingSection::create([
                    'landing_page_id' => $pageId,
                    'type' => $type,
                    'sort_order' => $index,
                    'is_enabled' => true,
                    'settings' => $this->presetSectionSettings($type),
                ]);

                $this->seedSectionPresetContent($section, $type);
            }
        });

        $this->clearCacheForPage($pageId);
    }

    protected function presetSectionSettings(string $type): array
    {
        return match ($type) {
            'features' => ['layout' => 'bento', 'show_icons' => true],
            'product_showcase' => ['showcase_type' => 'screenshots'],
            'hero' => ['show_trusted_by' => true],
            default => [],
        };
    }

    protected function seedSectionPresetContent(LandingSection $section, string $type): void
    {
        $content = match ($type) {
            'hero' => [
                'headlines' => ['Build faster with a ready-to-edit starter'],
                'subtitles' => ['Start with a structure that matches your project type, then refine it visually or in code.'],
                'typing_prompts' => ['Create a modern website...', 'Build a polished product page...', 'Launch a conversion-focused landing page...'],
                'suggestions' => ['Launch my SaaS', 'Create my portfolio', 'Build a restaurant site'],
                'cta_button' => 'Start building',
                'trusted_by_title' => 'Trusted by teams at',
            ],
            'social_proof' => [
                'users_label' => 'Happy users',
                'projects_label' => 'Projects created',
                'uptime_label' => 'Availability',
                'uptime_value' => 'High',
            ],
            'features' => [
                'title' => 'Everything you need',
                'subtitle' => 'A prepared foundation with sections you can reorder, replace, or edit in code.',
            ],
            'product_showcase' => [
                'title' => 'See it in action',
                'subtitle' => 'Show the core product or app flow without starting from a blank page.',
            ],
            'pricing' => [
                'title' => 'Simple pricing',
                'subtitle' => 'Clear plans that keep the page conversion-focused.',
            ],
            'testimonials' => [
                'title' => 'What users say',
                'subtitle' => 'A lightweight social proof block to start with.',
            ],
            'faq' => [
                'title' => 'Frequently asked questions',
                'subtitle' => 'Answer the most common objections early.',
            ],
            'categories' => [
                'title' => 'What will you build?',
                'subtitle' => 'Present the main paths or use cases in a compact grid.',
            ],
            'cta' => [
                'title' => 'Ready to build?',
                'subtitle' => 'Move from starter layout to a finished site with visual or manual editing.',
                'button_text' => 'Start now',
                'button_url' => '#',
            ],
            default => [],
        };

        if (! empty($content)) {
            foreach ($content as $field => $value) {
                LandingContent::updateOrCreate(
                    ['section_id' => $section->id, 'locale' => 'en', 'field' => $field],
                    ['value' => $value]
                );
            }
        }

        if ($type === 'features') {
            $this->seedPresetItems($section, 'feature', [
                ['title' => 'Drag and drop sections', 'description' => 'Reorder and refine the page structure quickly.', 'icon' => 'GripVertical', 'size' => 'medium'],
                ['title' => 'Manual code editing', 'description' => 'Switch to code when you need full control.', 'icon' => 'Code2', 'size' => 'medium'],
                ['title' => 'Project-specific starters', 'description' => 'Begin with a layout that fits the project category.', 'icon' => 'LayoutTemplate', 'size' => 'medium'],
            ]);
        } elseif ($type === 'testimonials') {
            $this->seedPresetItems($section, 'testimonial', [
                ['quote' => 'The starting layout saved us hours of setup.', 'author' => 'Alex Morgan', 'role' => 'Founder', 'avatar' => null, 'rating' => 5, 'company_url' => null],
                ['quote' => 'We could edit the structure immediately without fighting the tool.', 'author' => 'Priya Shah', 'role' => 'Product Lead', 'avatar' => null, 'rating' => 5, 'company_url' => null],
            ]);
        } elseif ($type === 'faq') {
            $this->seedPresetItems($section, 'faq', [
                ['question' => 'Can I change the layout later?', 'answer' => 'Yes. Every section can be reordered, replaced, or edited manually.'],
                ['question' => 'Can I switch to code editing?', 'answer' => 'Yes. The visual editor and code editor work side by side.'],
            ]);
        } elseif ($type === 'categories') {
            $this->seedPresetItems($section, 'category', [
                ['name' => 'Landing Pages', 'icon' => 'Layout'],
                ['name' => 'Dashboards', 'icon' => 'LayoutDashboard'],
                ['name' => 'Web Apps', 'icon' => 'Globe'],
                ['name' => 'Admin Panels', 'icon' => 'Settings'],
            ]);
        } elseif ($type === 'hero') {
            $this->seedPresetItems($section, 'logo', [
                ['name' => 'Acme', 'initial' => 'A', 'color' => 'bg-blue-500'],
                ['name' => 'Northstar', 'initial' => 'N', 'color' => 'bg-emerald-500'],
                ['name' => 'Pulse', 'initial' => 'P', 'color' => 'bg-violet-500'],
            ]);
        }
    }

    protected function seedPresetItems(LandingSection $section, string $itemType, array $items): void
    {
        foreach ($items as $index => $item) {
            LandingItem::create([
                'section_id' => $section->id,
                'locale' => 'en',
                'item_key' => (string) Str::uuid(),
                'sort_order' => $index,
                'is_enabled' => true,
                'data' => $item,
            ]);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // HTML code pages
    // ─────────────────────────────────────────────────────────────

    public function updatePageHtmlCode(int $pageId, string $htmlCode): void
    {
        $dir = storage_path("app/private/landing-pages/{$pageId}");

        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        file_put_contents("{$dir}/index.html", $htmlCode);
    }

    public function getPageHtmlCode(int $pageId): string
    {
        $path = storage_path("app/private/landing-pages/{$pageId}/index.html");

        return file_exists($path) ? file_get_contents($path) : '';
    }

    // ─────────────────────────────────────────────────────────────
    // Cache
    // ─────────────────────────────────────────────────────────────

    public function clearCacheForPage(?int $pageId): void
    {
        if ($pageId === null) {
            $this->clearCache();
            return;
        }

        $locales = array_merge(
            array_keys(self::$cachedLocales),
            ['en', 'ar', 'de', 'fr', 'ja', 'ru', 'es', 'zh', 'it', 'id', 'pt']
        );

        foreach (array_unique($locales) as $locale) {
            Cache::forget(self::CACHE_PREFIX."page:{$pageId}:{$locale}");
        }
    }

    public function clearCache(): void
    {
        $pages = LandingPage::pluck('id');

        foreach ($pages as $pageId) {
            $this->clearCacheForPage($pageId);
        }

        self::$cachedLocales = [];
    }

    public function getSectionTypes(): array
    {
        return LandingSection::getSectionTypes();
    }

    // ─────────────────────────────────────────────────────────────
    // Formatters
    // ─────────────────────────────────────────────────────────────

    protected function formatSectionForFrontend(LandingSection $section, string $locale): array
    {
        $content = $section->getContentForLocale($locale);
        $items   = $section->getItemsForLocale($locale);

        $formattedItems = array_map(function ($item) {
            unset($item['key'], $item['sort_order']);
            return $item;
        }, $items);

        return [
            'type'       => $section->type,
            'is_enabled' => $section->is_enabled,
            'settings'   => $section->settings ?? [],
            'content'    => $content,
            'items'      => $formattedItems,
        ];
    }

    protected function formatSectionForAdmin(LandingSection $section): array
    {
        $contentByLocale = [];
        foreach ($section->contents as $content) {
            $contentByLocale[$content->locale][$content->field] = $content->value;
        }

        $itemsByLocale = [];
        foreach ($section->items as $item) {
            $itemsByLocale[$item->locale][] = [
                'id'         => $item->id,
                'key'        => $item->item_key,
                'sort_order' => $item->sort_order,
                'is_enabled' => $item->is_enabled,
                'data'       => $item->data,
            ];
        }

        foreach ($itemsByLocale as $locale => $items) {
            usort($itemsByLocale[$locale], fn ($a, $b) => $a['sort_order'] <=> $b['sort_order']);
        }

        return [
            'id'              => $section->id,
            'landing_page_id' => $section->landing_page_id,
            'type'            => $section->type,
            'sort_order'      => $section->sort_order,
            'is_enabled'      => $section->is_enabled,
            'settings'        => $section->settings ?? [],
            'content'         => $contentByLocale,
            'items'           => $itemsByLocale,
        ];
    }
}
