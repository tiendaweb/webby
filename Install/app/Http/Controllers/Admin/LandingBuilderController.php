<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ChecksDemoMode;
use App\Models\LandingPage;
use App\Models\LandingSection;
use App\Models\Language;
use App\Models\Plan;
use App\Models\SystemSetting;
use App\Services\BroadcastService;
use App\Services\InternalAiService;
use App\Services\LandingPageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LandingBuilderController extends Controller
{
    use ChecksDemoMode;

    public function __construct(
        protected LandingPageService $landingPageService
    ) {}

    // ─────────────────────────────────────────────────────────────
    // Main builder view
    // ─────────────────────────────────────────────────────────────

    public function index(Request $request): Response
    {
        $pages = $this->landingPageService->getAllPagesForAdmin();

        // Determine active page for editing
        $pageId = $request->query('page');
        if ($pageId) {
            $currentPage = LandingPage::find($pageId);
        }
        if (empty($currentPage)) {
            $currentPage = LandingPage::where('is_home', true)->first()
                ?? LandingPage::first();
        }

        $sections     = ($currentPage && $currentPage->type !== 'html_code')
            ? $this->landingPageService->getAllSectionsForAdmin($currentPage->id)
            : [];
        $sectionTypes = $this->landingPageService->getSectionTypes();
        $presets      = $this->landingPageService->getPagePresets();
        $languages    = Language::active()->orderBy('sort_order')->get();
        $defaultLanguage = Language::getDefault()?->code ?? 'en';

        $htmlCode = ($currentPage && $currentPage->type === 'html_code')
            ? $this->landingPageService->getPageHtmlCode($currentPage->id)
            : null;

        return Inertia::render('Admin/LandingBuilder/Index', [
            'pages'           => $pages,
            'currentPage'     => $currentPage ? $currentPage->toArray() : null,
            'sections'        => $sections,
            'sectionTypes'    => $sectionTypes,
            'presets'         => $presets,
            'languages'       => $languages,
            'defaultLanguage' => $defaultLanguage,
            'htmlCode'        => $htmlCode,
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // Page CRUD
    // ─────────────────────────────────────────────────────────────

    public function storePage(Request $request): RedirectResponse|JsonResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $request->wantsJson()
                ? response()->json(['error' => __('This action is disabled in demo mode.')], 403)
                : $redirect;
        }

        $validated = $request->validate([
            'name'             => 'required|string|max:100',
            'slug'             => [
                'required', 'string', 'max:100',
                'alpha_dash',
                'unique:landing_pages,slug',
                function ($attr, $value, $fail) {
                    if (LandingPage::isReservedSlug($value)) {
                        $fail(__('This slug is reserved and cannot be used.'));
                    }
                },
            ],
            'type'             => 'sometimes|in:sections,html_code',
            'preset'           => 'nullable|string|in:default,saas,ecommerce,dashboard,portfolio,restaurant,cms',
            'is_active'        => 'boolean',
            'meta_title'       => 'nullable|string|max:160',
            'meta_description' => 'nullable|string|max:300',
        ]);

        $page = $this->landingPageService->createPage($validated);

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'page' => $page]);
        }

        return redirect()->route('admin.landing-builder.index', ['page' => $page->id])
            ->with('success', __('Landing page created successfully.'));
    }

    public function updatePage(Request $request, LandingPage $landingPage): RedirectResponse|JsonResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $request->wantsJson()
                ? response()->json(['error' => __('This action is disabled in demo mode.')], 403)
                : $redirect;
        }

        $validated = $request->validate([
            'name'             => 'sometimes|string|max:100',
            'slug'             => [
                'sometimes', 'string', 'max:100', 'alpha_dash',
                Rule::unique('landing_pages', 'slug')->ignore($landingPage->id),
                function ($attr, $value, $fail) {
                    if (LandingPage::isReservedSlug($value)) {
                        $fail(__('This slug is reserved and cannot be used.'));
                    }
                },
            ],
            'is_active'        => 'sometimes|boolean',
            'is_home'          => 'sometimes|boolean',
            'meta_title'       => 'nullable|string|max:160',
            'meta_description' => 'nullable|string|max:300',
        ]);

        $page = $this->landingPageService->updatePage($landingPage->id, $validated);

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'page' => $page]);
        }

        return back()->with('success', __('Landing page updated successfully.'));
    }

    public function destroyPage(LandingPage $landingPage): RedirectResponse|JsonResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        try {
            $this->landingPageService->deletePage($landingPage->id);
        } catch (\RuntimeException $e) {
            return back()->withErrors(['page' => $e->getMessage()]);
        }

        return redirect()->route('admin.landing-builder.index')
            ->with('success', __('Landing page deleted.'));
    }

    public function updatePageCode(Request $request, LandingPage $landingPage): JsonResponse
    {
        if ($this->denyIfDemo()) {
            return response()->json(['error' => __('This action is disabled in demo mode.')], 403);
        }

        $validated = $request->validate([
            'html_code' => 'present|nullable|string|max:10485760',
        ]);

        $this->landingPageService->updatePageHtmlCode($landingPage->id, $validated['html_code'] ?? '');

        return response()->json(['success' => true, 'message' => __('HTML code saved successfully.')]);
    }

    public function setHomePage(LandingPage $landingPage): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $this->landingPageService->setAsHome($landingPage->id);

        return back()->with('success', __('Home page updated.'));
    }

    public function togglePageActive(LandingPage $landingPage): JsonResponse
    {
        if ($this->denyIfDemo()) {
            return response()->json(['error' => __('This action is disabled in demo mode.')], 403);
        }

        $page = $this->landingPageService->toggleActive($landingPage->id);

        return response()->json(['success' => true, 'is_active' => $page->is_active]);
    }

    // ─────────────────────────────────────────────────────────────
    // Preview
    // ─────────────────────────────────────────────────────────────

    public function preview(Request $request): Response
    {
        $locale = $request->input('locale', app()->getLocale());
        $pageId = $request->query('page');

        $config = $this->landingPageService->getPreviewConfig($locale, $pageId ? (int) $pageId : null);

        $internalAiService = app(InternalAiService::class);
        if (isset($config['sections'])) {
            foreach ($config['sections'] as &$section) {
                if ($section['type'] === 'hero') {
                    $content = $section['content'] ?? [];
                    if (empty($content['headlines'])) {
                        $headlines = $internalAiService->getHeroHeadlines(4, $locale);
                        $content['headlines'] = ! empty($headlines)
                            ? [$headlines[array_rand($headlines)]]
                            : [InternalAiService::STATIC_HERO_HEADLINES[0]];
                    }
                    if (empty($content['subtitles'])) {
                        $subtitles = $internalAiService->getHeroSubtitles(4, $locale);
                        $content['subtitles'] = ! empty($subtitles)
                            ? [$subtitles[array_rand($subtitles)]]
                            : [InternalAiService::STATIC_HERO_SUBTITLES[0]];
                    }
                    if (empty($content['suggestions'])) {
                        $content['suggestions'] = $internalAiService->getSuggestions(4, $locale);
                    }
                    if (empty($content['typing_prompts'])) {
                        $content['typing_prompts'] = $internalAiService->getTypingPrompts(8, $locale);
                    }
                    $section['content'] = $content;
                    break;
                }
            }
            unset($section);
        }

        return Inertia::render('Landing', array_merge($config, [
            'isPreview'          => true,
            'canLogin'           => Route::has('login'),
            'canRegister'        => Route::has('register') && SystemSetting::get('enable_registration', true),
            'plans'              => Plan::active()->orderBy('sort_order')->get([
                'id', 'name', 'slug', 'description', 'price', 'billing_period',
                'monthly_build_credits', 'max_projects', 'enable_firebase',
                'enable_file_storage', 'max_storage_mb', 'features', 'is_popular',
                'allow_user_ai_api_key',
            ]),
            'isPusherConfigured' => app(BroadcastService::class)->isConfigured(),
            'statistics'         => ['users' => 0, 'projects' => 0],
        ]));
    }

    // ─────────────────────────────────────────────────────────────
    // Section operations
    // ─────────────────────────────────────────────────────────────

    public function reorder(Request $request): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'exists:landing_sections,id',
        ]);

        $this->landingPageService->reorderSections($validated['ids']);

        return back()->with('success', __('Sections reordered successfully.'));
    }

    public function updateSection(Request $request, LandingSection $section): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'is_enabled' => 'boolean',
            'settings'   => 'nullable|array',
        ]);

        $this->landingPageService->updateSection($section->id, $validated);

        return back()->with('success', __('Section updated successfully.'));
    }

    public function updateContent(Request $request, LandingSection $section): RedirectResponse|JsonResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $request->wantsJson()
                ? response()->json(['error' => __('This action is disabled in demo mode.')], 403)
                : $redirect;
        }

        $validated = $request->validate([
            'locale' => ['required', 'string', 'max:10', Rule::exists('languages', 'code')],
            'fields' => 'required|array',
        ]);

        $this->landingPageService->updateContent($section->id, $validated['locale'], $validated['fields']);

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'message' => __('Content updated successfully.')]);
        }

        return back()->with('success', __('Content updated successfully.'));
    }

    public function updateItems(Request $request, LandingSection $section): RedirectResponse|JsonResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $request->wantsJson()
                ? response()->json(['error' => __('This action is disabled in demo mode.')], 403)
                : $redirect;
        }

        $request->validate([
            'locale'                  => ['required', 'string', 'max:10', Rule::exists('languages', 'code')],
            'items'                   => 'required|array',
            'items.*.key'             => 'required|uuid',
            'items.*.sort_order'      => 'required|integer|min:0',
            'items.*.is_enabled'      => 'boolean',
            'items.*.data'            => 'required|array',
            'items.*.data.rating'     => 'nullable|integer|min:1|max:5',
            'items.*.data.answer'     => 'nullable|string|max:10000',
            'items.*.data.image_url'  => 'nullable|string|max:500',
            'items.*.data.avatar'     => 'nullable|string|max:500',
            'items.*.data.company_url' => 'nullable|string|max:500',
        ]);

        $this->landingPageService->updateItems($section->id, $request->input('locale'), $request->input('items'));

        if ($request->wantsJson()) {
            return response()->json(['success' => true, 'message' => __('Items updated successfully.')]);
        }

        return back()->with('success', __('Items updated successfully.'));
    }

    public function addSection(Request $request, LandingPage $landingPage): JsonResponse
    {
        if ($this->denyIfDemo()) {
            return response()->json(['error' => __('This action is disabled in demo mode.')], 403);
        }

        $section = $this->landingPageService->addHtmlBlock($landingPage->id);

        return response()->json([
            'success' => true,
            'section' => [
                'id'              => $section->id,
                'landing_page_id' => $section->landing_page_id,
                'type'            => $section->type,
                'sort_order'      => $section->sort_order,
                'is_enabled'      => $section->is_enabled,
                'settings'        => $section->settings ?? [],
                'content'         => [],
                'items'           => [],
            ],
        ]);
    }

    public function destroySection(LandingSection $section): JsonResponse
    {
        if ($this->denyIfDemo()) {
            return response()->json(['error' => __('This action is disabled in demo mode.')], 403);
        }

        $this->landingPageService->deleteSection($section->id);

        return response()->json(['success' => true]);
    }

    public function generateHtml(Request $request): JsonResponse
    {
        if ($this->denyIfDemo()) {
            return response()->json(['error' => __('This action is disabled in demo mode.')], 403);
        }

        $validated = $request->validate([
            'prompt' => 'required|string|max:2000',
            'locale' => 'sometimes|string|max:10',
        ]);

        $aiService = app(InternalAiService::class);

        if (! $aiService->isConfigured()) {
            return response()->json(['error' => __('Internal AI is not configured.')], 422);
        }

        $html = $aiService->generateHtmlBlock($validated['prompt'], $validated['locale'] ?? 'en');

        if ($html === null) {
            return response()->json(['error' => __('Failed to generate HTML. Please try again.')], 500);
        }

        return response()->json(['success' => true, 'html' => $html]);
    }

    public function uploadMedia(Request $request): JsonResponse
    {
        if (config('app.demo')) {
            return response()->json(['error' => __('This action is disabled in demo mode.')], 403);
        }

        $request->validate([
            'file' => 'required|file|mimes:jpg,jpeg,png,svg,webp|max:2048',
            'type' => 'required|in:logo,avatar,image',
        ]);

        $file     = $request->file('file');
        $filename = time().'_'.$file->getClientOriginalName();
        $path     = $file->storeAs('landing', $filename, 'public');

        return response()->json([
            'path' => basename($path),
            'url'  => Storage::disk('public')->url($path),
        ]);
    }

    public function deleteMedia(Request $request): JsonResponse
    {
        if (config('app.demo')) {
            return response()->json(['error' => __('This action is disabled in demo mode.')], 403);
        }

        $validated = $request->validate(['path' => 'required|string']);
        $fullPath  = 'landing/'.$validated['path'];

        if (Storage::disk('public')->exists($fullPath)) {
            Storage::disk('public')->delete($fullPath);
        }

        return response()->json(['success' => true]);
    }
}
