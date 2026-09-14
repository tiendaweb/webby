<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectPageSetting;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;

class ProjectSeoService
{
    public function __construct(
        protected ProjectStructureService $structureService,
        protected ProjectWorkspaceService $workspaceService,
        protected BuilderService $builderService,
    ) {}

    public function index(Project $project): array
    {
        $paths = $this->pagePaths($project);
        $settings = $project->pageSettings()
            ->whereIn('page_path', $paths)
            ->get()
            ->keyBy('page_path');

        return [
            'pages' => array_map(function (string $path) use ($project, $settings) {
                $setting = $settings->get($path);

                return $this->settingPayload($project, $path, $setting);
            }, $paths),
            'audit' => $this->audit($project),
        ];
    }

    public function save(Project $project, array $data): array
    {
        $pagePath = $this->structureService->normalizeSourcePath((string) ($data['page_path'] ?? ''));

        if (! in_array($pagePath, $this->pagePaths($project), true)) {
            throw new InvalidArgumentException('Page not found.');
        }

        $setting = ProjectPageSetting::updateOrCreate(
            [
                'project_id' => $project->id,
                'page_path' => $pagePath,
            ],
            [
                'title' => $this->nullableTrim($data['title'] ?? null),
                'description' => $this->nullableTrim($data['description'] ?? null),
                'slug' => $this->normalizeSlug($data['slug'] ?? null),
                'canonical_url' => $this->nullableTrim($data['canonical_url'] ?? null),
                'social_image' => $this->nullableTrim($data['social_image'] ?? null),
                'favicon' => $this->nullableTrim($data['favicon'] ?? null),
                'indexable' => (bool) ($data['indexable'] ?? true),
            ]
        );

        $this->applySeoToSource($project, $setting);
        $this->writeSeoAssets($project);

        if ($project->builder) {
            $this->builderService->triggerBuild($project->builder, $project->id, $project->id);
        }

        return [
            'success' => true,
            'page' => $this->settingPayload($project, $pagePath, $setting->fresh()),
            'audit' => $this->audit($project),
        ];
    }

    public function audit(Project $project): array
    {
        $issues = [];
        $paths = $this->pagePaths($project);
        $settings = $project->pageSettings()->whereIn('page_path', $paths)->get()->keyBy('page_path');

        foreach ($paths as $path) {
            try {
                $content = $this->structureService->readSource($project, $path);
            } catch (\Throwable) {
                continue;
            }

            $setting = $settings->get($path);
            $title = $setting?->title ?: $this->htmlTitle($content) ?: ($path === 'index.html' ? $project->published_title : null);
            $description = $setting?->description ?: $this->htmlDescription($content) ?: ($path === 'index.html' ? $project->published_description : null);

            if (! $title) {
                $issues[] = $this->issue('error', $path, 'title', 'Falta el título SEO de esta página.');
            } elseif (mb_strlen($title) > 65) {
                $issues[] = $this->issue('warning', $path, 'title_length', 'El título SEO supera los 65 caracteres.');
            }

            if (! $description) {
                $issues[] = $this->issue('warning', $path, 'description', 'Falta la descripción SEO de esta página.');
            } elseif (mb_strlen($description) > 160) {
                $issues[] = $this->issue('warning', $path, 'description_length', 'La descripción SEO supera los 160 caracteres.');
            }

            $missingAlt = $this->countImagesWithoutAlt($content);
            if ($missingAlt > 0) {
                $issues[] = $this->issue('warning', $path, 'image_alt', "{$missingAlt} imagen(es) no tienen texto alt.");
            }

            $emptyLinks = $this->countEmptyLinks($content);
            if ($emptyLinks > 0) {
                $issues[] = $this->issue('warning', $path, 'empty_links', "{$emptyLinks} enlace(s) están vacíos o apuntan a #.");
            }

            if ($path === 'index.html' && ! $setting?->favicon && ! $this->hasFavicon($content)) {
                $issues[] = $this->issue('warning', $path, 'favicon', 'No hay favicon configurado.');
            }
        }

        $errors = collect($issues)->where('severity', 'error')->count();
        $warnings = collect($issues)->where('severity', 'warning')->count();

        return [
            'issues' => $issues,
            'summary' => [
                'errors' => $errors,
                'warnings' => $warnings,
                'passed' => $errors === 0,
            ],
        ];
    }

    private function applySeoToSource(Project $project, ProjectPageSetting $setting): void
    {
        $extension = strtolower(pathinfo($setting->page_path, PATHINFO_EXTENSION));
        if (! in_array($extension, ['html', 'htm', 'php'], true)) {
            return;
        }

        try {
            $html = $this->structureService->readSource($project, $setting->page_path);
        } catch (\Throwable) {
            return;
        }

        if (! str_contains(strtolower($html), '<head')) {
            return;
        }

        $title = $setting->title ?: $project->published_title ?: $project->name;
        $description = $setting->description ?: $project->published_description;
        $canonical = $setting->canonical_url ?: $this->canonicalUrl($project, $setting);

        $html = $this->replaceOrInsertTitle($html, $title);
        $html = $this->replaceOrInsertMeta($html, 'name', 'description', $description);
        $html = $this->replaceOrInsertMeta($html, 'property', 'og:title', $title);
        $html = $this->replaceOrInsertMeta($html, 'property', 'og:description', $description);
        $html = $this->replaceOrInsertMeta($html, 'name', 'twitter:title', $title);
        $html = $this->replaceOrInsertMeta($html, 'name', 'twitter:description', $description);
        $html = $this->replaceOrInsertLink($html, 'canonical', $canonical);

        if ($setting->social_image) {
            $html = $this->replaceOrInsertMeta($html, 'property', 'og:image', $setting->social_image);
            $html = $this->replaceOrInsertMeta($html, 'name', 'twitter:image', $setting->social_image);
        }

        if ($setting->favicon) {
            $html = $this->replaceOrInsertLink($html, 'icon', $setting->favicon);
        }

        if (! $setting->indexable) {
            $html = $this->replaceOrInsertMeta($html, 'name', 'robots', 'noindex,nofollow');
        }

        $this->writeSourceFile($project, $setting->page_path, $html);
    }

    private function writeSeoAssets(Project $project): void
    {
        $baseUrl = rtrim((string) ($project->getPublicUrl() ?: config('app.url')), '/');
        $settings = $project->pageSettings()->get()->keyBy('page_path');
        $urls = [];

        foreach ($this->pagePaths($project) as $path) {
            $setting = $settings->get($path);
            if ($setting && ! $setting->indexable) {
                continue;
            }

            $slug = $setting?->slug ?: $this->defaultSlug($path);
            $urls[] = $baseUrl.($slug === '/' ? '' : '/'.ltrim($slug, '/'));
        }

        $sitemap = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        $sitemap .= "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
        foreach (array_unique($urls) as $url) {
            $sitemap .= '  <url><loc>'.htmlspecialchars($url, ENT_QUOTES, 'UTF-8')."</loc></url>\n";
        }
        $sitemap .= "</urlset>\n";

        $robots = "User-agent: *\nAllow: /\nSitemap: {$baseUrl}/sitemap.xml\n";

        $this->writeProjectFile($project, 'sitemap.xml', $sitemap);
        $this->writeProjectFile($project, 'robots.txt', $robots);
    }

    private function writeProjectFile(Project $project, string $path, string $content): void
    {
        if ($project->builder) {
            $this->builderService->updateFile($project->builder, $project->id, $path, $content);

            return;
        }

        $this->workspaceService->writeFile($project, $path, $content);
    }

    private function writeSourceFile(Project $project, string $path, string $content): void
    {
        if ($project->builder) {
            $this->builderService->updateFile($project->builder, $project->id, $path, $content);

            return;
        }

        $this->structureService->writeSource($project, $path, $content);
    }

    private function pagePaths(Project $project): array
    {
        return $this->structureService->sourcePaths($project);
    }

    private function settingPayload(Project $project, string $path, ?ProjectPageSetting $setting): array
    {
        return [
            'page_path' => $path,
            'title' => $setting?->title ?? ($path === 'index.html' ? ($project->published_title ?: $project->name) : null),
            'description' => $setting?->description ?? ($path === 'index.html' ? $project->published_description : null),
            'slug' => $setting?->slug ?? $this->defaultSlug($path),
            'canonical_url' => $setting?->canonical_url ?? null,
            'social_image' => $setting?->social_image ?? ($path === 'index.html' && $project->share_image ? '/storage/'.$project->share_image : null),
            'favicon' => $setting?->favicon ?? null,
            'indexable' => $setting?->indexable ?? true,
        ];
    }

    private function replaceOrInsertTitle(string $html, string $title): string
    {
        $tag = '<title>'.htmlspecialchars($title, ENT_QUOTES, 'UTF-8').'</title>';
        if (preg_match('/<title[^>]*>.*?<\/title>/is', $html) === 1) {
            return preg_replace('/<title[^>]*>.*?<\/title>/is', $tag, $html, 1) ?? $html;
        }

        return $this->insertBeforeHeadClose($html, $tag);
    }

    private function replaceOrInsertMeta(string $html, string $attribute, string $key, ?string $content): string
    {
        if ($content === null || trim($content) === '') {
            return $html;
        }

        $escapedKey = preg_quote($key, '/');
        $tag = sprintf(
            '<meta %s="%s" content="%s">',
            $attribute,
            htmlspecialchars($key, ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($content, ENT_QUOTES, 'UTF-8')
        );
        $pattern = '/<meta\b(?=[^>]*\b'.$attribute.'=["\']'.$escapedKey.'["\'])[^>]*>/i';

        if (preg_match($pattern, $html) === 1) {
            return preg_replace($pattern, $tag, $html, 1) ?? $html;
        }

        return $this->insertBeforeHeadClose($html, $tag);
    }

    private function replaceOrInsertLink(string $html, string $rel, ?string $href): string
    {
        if ($href === null || trim($href) === '') {
            return $html;
        }

        $escapedRel = preg_quote($rel, '/');
        $tag = sprintf(
            '<link rel="%s" href="%s">',
            htmlspecialchars($rel, ENT_QUOTES, 'UTF-8'),
            htmlspecialchars($href, ENT_QUOTES, 'UTF-8')
        );
        $pattern = '/<link\b(?=[^>]*\brel=["\']'.$escapedRel.'["\'])[^>]*>/i';

        if (preg_match($pattern, $html) === 1) {
            return preg_replace($pattern, $tag, $html, 1) ?? $html;
        }

        return $this->insertBeforeHeadClose($html, $tag);
    }

    private function insertBeforeHeadClose(string $html, string $tag): string
    {
        if (stripos($html, '</head>') === false) {
            return $html;
        }

        return preg_replace('/<\/head>/i', "    {$tag}\n</head>", $html, 1) ?? $html;
    }

    private function htmlTitle(string $html): ?string
    {
        if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $html, $match) !== 1) {
            return null;
        }

        return trim(html_entity_decode(strip_tags($match[1]), ENT_QUOTES, 'UTF-8')) ?: null;
    }

    private function htmlDescription(string $html): ?string
    {
        if (preg_match('/<meta\b(?=[^>]*\bname=["\']description["\'])(?=[^>]*\bcontent=(["\'])(.*?)\1)[^>]*>/i', $html, $match) !== 1) {
            return null;
        }

        return trim(html_entity_decode($match[2], ENT_QUOTES, 'UTF-8')) ?: null;
    }

    private function hasFavicon(string $html): bool
    {
        return preg_match('/<link\b(?=[^>]*\brel=["\'](?:shortcut icon|icon)["\'])[^>]*>/i', $html) === 1;
    }

    private function countImagesWithoutAlt(string $html): int
    {
        if (! preg_match_all('/<img\b[^>]*>/i', $html, $matches)) {
            return 0;
        }

        return collect($matches[0])->filter(fn (string $tag) => preg_match('/\salt=(["\']).*?\1/i', $tag) !== 1)->count();
    }

    private function countEmptyLinks(string $html): int
    {
        if (! preg_match_all('/<a\b(?=[^>]*\bhref=(["\'])(.*?)\1)[^>]*>/i', $html, $matches)) {
            return 0;
        }

        return collect($matches[2])->filter(fn (string $href) => trim($href) === '' || trim($href) === '#')->count();
    }

    private function canonicalUrl(Project $project, ProjectPageSetting $setting): string
    {
        $base = rtrim((string) ($project->getPublicUrl() ?: config('app.url')), '/');
        $slug = $setting->slug ?: $this->defaultSlug($setting->page_path);

        return $base.($slug === '/' ? '' : '/'.ltrim($slug, '/'));
    }

    private function defaultSlug(string $path): string
    {
        if ($path === 'index.html') {
            return '/';
        }

        return '/'.Str::slug(pathinfo($path, PATHINFO_FILENAME));
    }

    private function normalizeSlug(mixed $slug): ?string
    {
        $value = $this->nullableTrim($slug);
        if ($value === null) {
            return null;
        }

        $value = '/'.trim($value, '/');

        return $value === '/' ? '/' : '/'.Str::slug(trim($value, '/'));
    }

    private function nullableTrim(mixed $value): ?string
    {
        $value = trim((string) ($value ?? ''));

        return $value === '' ? null : $value;
    }

    private function issue(string $severity, string $pagePath, string $code, string $message): array
    {
        return [
            'severity' => $severity,
            'page_path' => $pagePath,
            'code' => $code,
            'message' => $message,
        ];
    }
}
