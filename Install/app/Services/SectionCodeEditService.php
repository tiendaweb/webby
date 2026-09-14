<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class SectionCodeEditService
{
    private const EDITABLE_EXTENSIONS = [
        'html', 'htm', 'php', 'jsx', 'tsx', 'js', 'ts',
    ];

    private const VOID_TAGS = [
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
        'meta', 'param', 'source', 'track', 'wbr',
    ];

    public function __construct(
        protected ProjectWorkspaceService $workspaceService,
        protected BuilderService $builderService,
    ) {}

    public function resolve(Project $project, array $data): array
    {
        $data['outerHTML'] = (string) ($data['outerHTML'] ?? '');
        $data['tagName'] = strtolower((string) ($data['tagName'] ?? ''));

        if ($data['outerHTML'] === '' || $data['tagName'] === '') {
            throw new InvalidArgumentException('Selected element code is required.');
        }

        $sourcePath = isset($data['sourcePath']) && $data['sourcePath'] !== ''
            ? $this->normalizeSourcePath($data['sourcePath'])
            : null;
        $previewPath = isset($data['previewPath']) && $data['previewPath'] !== ''
            ? $this->normalizeSourcePath($data['previewPath'])
            : null;

        if ($sourcePath !== null) {
            $source = $this->readSourceFile($project, $sourcePath);
            $matches = $this->findMatchesInContent($source['content'], $data);
            $best = $this->pickBestMatch($matches);

            if ($best !== null) {
                return $this->resolvedPayload($sourcePath, $best);
            }

            return [
                'success' => false,
                'needs_source_choice' => false,
                'candidates' => [],
                'message' => count($matches) === 0
                    ? 'The selected file does not contain a safe matching section.'
                    : 'The selected file contains multiple matching sections.',
            ];
        }

        $candidates = $this->findCandidates($project, $data, array_values(array_filter(array_unique([
            $previewPath,
        ]))));

        if (count($candidates) === 1 && ($candidates[0]['occurrences'] ?? 0) === 1 && (($candidates[0]['confidence'] ?? 0) >= 80)) {
            $source = $this->readSourceFile($project, $candidates[0]['sourcePath']);
            $matches = $this->findMatchesInContent($source['content'], $data);
            $best = $this->pickBestMatch($matches);

            if ($best !== null) {
                return $this->resolvedPayload($candidates[0]['sourcePath'], $best);
            }
        }

        return [
            'success' => false,
            'needs_source_choice' => count($candidates) > 0,
            'candidates' => $candidates,
            'message' => count($candidates) === 0
                ? 'No safe source block was found for this section.'
                : 'Choose the source file to edit.',
        ];
    }

    public function save(Project $project, array $data): array
    {
        $sourcePath = $this->normalizeSourcePath((string) ($data['sourcePath'] ?? ''));
        $originalCode = (string) ($data['originalCode'] ?? '');
        $newCode = (string) ($data['newCode'] ?? '');

        if ($originalCode === '') {
            throw new InvalidArgumentException('Original section code is required.');
        }

        $source = $this->readSourceFile($project, $sourcePath);
        $replacement = $this->replaceUniqueBlock($source['content'], $originalCode, $newCode);

        if ($replacement === null) {
            throw new RuntimeException('The source file no longer contains a unique matching section.');
        }

        $this->writeSourceFile($project, $sourcePath, $replacement);
        $build = $this->syncPreviewAfterWrite($project);

        return [
            'success' => true,
            'sourcePath' => $sourcePath,
            'preview_url' => $build['preview_url'],
            'warning' => $build['warning'],
        ];
    }

    private function resolvedPayload(string $sourcePath, array $match): array
    {
        return [
            'success' => true,
            'sourcePath' => $sourcePath,
            'code' => $match['code'],
            'language' => $this->languageForPath($sourcePath),
            'matchType' => $match['matchType'] ?? 'exact',
            'confidence' => $match['confidence'] ?? 100,
            'reason' => $match['reason'] ?? null,
        ];
    }

    private function findCandidates(Project $project, array $data, array $preferredPaths = []): array
    {
        $candidates = [];
        $preferredPaths = array_values(array_filter(array_unique(array_map(
            fn (string $path) => $this->normalizeSourcePath($path),
            $preferredPaths
        ))));
        $allPaths = $this->listEditableSourcePaths($project);
        $paths = array_values(array_unique(array_merge(
            array_values(array_intersect($preferredPaths, $allPaths)),
            array_values(array_diff($allPaths, $preferredPaths))
        )));

        foreach ($paths as $index => $sourcePath) {
            try {
                $source = $this->readSourceFile($project, $sourcePath);
            } catch (\Throwable) {
                continue;
            }

            if (str_contains($source['content'], "\0")) {
                continue;
            }

            $matches = $this->findMatchesInContent($source['content'], $data);

            if (count($matches) === 0) {
                continue;
            }

            $best = $this->pickBestMatch($matches) ?? $matches[0];
            $isPreferred = in_array($sourcePath, $preferredPaths, true);

            $candidates[] = [
                'sourcePath' => $sourcePath,
                'occurrences' => count($matches),
                'snippet' => $this->snippetAround($best['code'], null),
                'matchType' => $isPreferred ? 'preview-path' : ($best['matchType'] ?? 'structure'),
                'confidence' => min(100, (int) ($best['confidence'] ?? 50) + ($isPreferred ? 8 : 0)),
                'reason' => $isPreferred
                    ? 'Matches the current preview source path'
                    : ($best['reason'] ?? null),
            ];

            if (count($candidates) >= 25) {
                break;
            }
        }

        usort($candidates, function (array $a, array $b) use ($preferredPaths) {
            $aPreferred = in_array($a['sourcePath'], $preferredPaths, true);
            $bPreferred = in_array($b['sourcePath'], $preferredPaths, true);

            if ($aPreferred !== $bPreferred) {
                return $aPreferred ? -1 : 1;
            }

            $confidenceDiff = (int) ($b['confidence'] ?? 0) <=> (int) ($a['confidence'] ?? 0);
            if ($confidenceDiff !== 0) {
                return $confidenceDiff;
            }

            return (int) ($b['occurrences'] ?? 0) <=> (int) ($a['occurrences'] ?? 0);
        });

        return $candidates;
    }

    private function findMatchesInContent(string $content, array $data): array
    {
        $outerHTML = (string) $data['outerHTML'];
        $target = $this->parseHtmlProfile($outerHTML, (string) $data['tagName'], (string) ($data['textPreview'] ?? ''));
        $matches = [];

        foreach ($this->exactNeedles($outerHTML) as $needle) {
            foreach ($this->findExactOccurrences($content, $needle) as $match) {
                $match['matchType'] = 'exact';
                $match['confidence'] = 100;
                $match['reason'] = 'Exact source match';
                $matches[] = $match;
            }
        }

        if (count($matches) > 0) {
            return $this->uniqueMatches($matches);
        }

        $normalizedTarget = $this->normalizeHtml($outerHTML);
        if ($normalizedTarget === '') {
            return [];
        }

        foreach ($this->extractTagBlocks($content, (string) $data['tagName']) as $block) {
            if ($this->normalizeHtml($block['code']) === $normalizedTarget) {
                $block['matchType'] = 'normalized';
                $block['confidence'] = 94;
                $block['reason'] = 'Normalized HTML match';
                $matches[] = $block;
                continue;
            }

            $score = $this->scoreStructuralMatch($target, $this->parseHtmlProfile($block['code'], (string) $data['tagName'], ''));
            if ($score['confidence'] >= 72) {
                $block['matchType'] = 'structure';
                $block['confidence'] = $score['confidence'];
                $block['reason'] = $score['reason'];
                $matches[] = $block;
            }
        }

        return $this->uniqueMatches($matches);
    }

    private function exactNeedles(string $outerHTML): array
    {
        return array_values(array_unique(array_filter([
            $outerHTML,
            html_entity_decode($outerHTML, ENT_QUOTES, 'UTF-8'),
        ], fn (string $value) => $value !== '')));
    }

    private function findExactOccurrences(string $content, string $needle): array
    {
        $matches = [];
        $offset = 0;

        while (($position = strpos($content, $needle, $offset)) !== false) {
            $matches[] = [
                'start' => $position,
                'end' => $position + strlen($needle),
                'code' => $needle,
            ];
            $offset = $position + 1;
        }

        return $matches;
    }

    private function extractTagBlocks(string $content, string $tagName): array
    {
        if (! preg_match('/^[a-z][a-z0-9:-]*$/i', $tagName)) {
            return [];
        }

        if (in_array(strtolower($tagName), self::VOID_TAGS, true)) {
            return $this->extractVoidTagBlocks($content, $tagName);
        }

        return $this->extractPairedTagBlocks($content, $tagName);
    }

    private function extractVoidTagBlocks(string $content, string $tagName): array
    {
        if (! preg_match_all('#<'.preg_quote($tagName, '#').'\b[^>]*>#i', $content, $matches, PREG_OFFSET_CAPTURE)) {
            return [];
        }

        return array_map(fn (array $match) => [
            'start' => $match[1],
            'end' => $match[1] + strlen($match[0]),
            'code' => $match[0],
        ], $matches[0]);
    }

    private function extractPairedTagBlocks(string $content, string $tagName): array
    {
        if (! preg_match_all('#</?'.preg_quote($tagName, '#').'\b[^>]*>#i', $content, $tokens, PREG_OFFSET_CAPTURE)) {
            return [];
        }

        $stack = [];
        $blocks = [];

        foreach ($tokens[0] as $token) {
            [$text, $position] = $token;
            $isClosing = str_starts_with($text, '</');
            $isSelfClosing = str_ends_with(rtrim($text), '/>');

            if (! $isClosing && ! $isSelfClosing) {
                $stack[] = $position;
                continue;
            }

            if ($isClosing && count($stack) > 0) {
                $start = array_pop($stack);
                $end = $position + strlen($text);
                $blocks[] = [
                    'start' => $start,
                    'end' => $end,
                    'code' => substr($content, $start, $end - $start),
                ];
            }
        }

        return $blocks;
    }

    private function uniqueMatches(array $matches): array
    {
        $seen = [];
        $unique = [];

        foreach ($matches as $match) {
            $key = $match['start'].'-'.$match['end'].'-'.($match['matchType'] ?? 'unknown');
            if (isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $unique[] = $match;
        }

        usort($unique, fn (array $a, array $b) => $a['start'] <=> $b['start']);

        return $unique;
    }

    private function pickBestMatch(array $matches): ?array
    {
        if ($matches === []) {
            return null;
        }

        usort($matches, function (array $a, array $b) {
            $confidenceDiff = (int) ($b['confidence'] ?? 0) <=> (int) ($a['confidence'] ?? 0);
            if ($confidenceDiff !== 0) {
                return $confidenceDiff;
            }

            return ($a['start'] ?? 0) <=> ($b['start'] ?? 0);
        });

        $best = $matches[0];

        if (($best['confidence'] ?? 0) < 80) {
            return null;
        }

        if (isset($matches[1]) && (int) ($matches[1]['confidence'] ?? 0) === (int) ($best['confidence'] ?? 0)) {
            return null;
        }

        if (isset($matches[1]) && (int) ($matches[1]['confidence'] ?? 0) >= ((int) ($best['confidence'] ?? 0) - 3)) {
            return null;
        }

        return $best;
    }

    private function replaceUniqueBlock(string $content, string $originalCode, string $newCode): ?string
    {
        $exactMatches = $this->findExactOccurrences($content, $originalCode);

        if (count($exactMatches) === 1) {
            return Str::replaceFirst($originalCode, $newCode, $content);
        }

        if (count($exactMatches) > 1) {
            return null;
        }

        $normalizedOriginal = $this->normalizeHtml($originalCode);
        $matches = [];

        if (preg_match('/^<([a-z][a-z0-9:-]*)\b/i', trim($originalCode), $tagMatch)) {
            foreach ($this->extractTagBlocks($content, strtolower($tagMatch[1])) as $block) {
                if ($this->normalizeHtml($block['code']) === $normalizedOriginal) {
                    $matches[] = $block;
                }
            }
        }

        if (count($matches) !== 1) {
            return null;
        }

        return substr($content, 0, $matches[0]['start'])
            .$newCode
            .substr($content, $matches[0]['end']);
    }

    private function normalizeHtml(string $html): string
    {
        $html = html_entity_decode($html, ENT_QUOTES, 'UTF-8');
        $html = preg_replace('/\s+/', ' ', trim($html)) ?? trim($html);
        $html = preg_replace('/>\s+</', '><', $html) ?? $html;

        return $html;
    }

    private function parseHtmlProfile(string $html, string $fallbackTagName, string $textPreview = ''): array
    {
        $profile = [
            'tagName' => $fallbackTagName,
            'text' => trim($this->cleanText($html)),
            'attributes' => [],
        ];

        if (! preg_match('/^<([a-z][a-z0-9:-]*)([^>]*)>/i', trim($html), $match)) {
            return $profile;
        }

        $profile['tagName'] = strtolower($match[1]);
        $profile['attributes'] = $this->parseAttributes($match[2]);

        if ($textPreview !== '') {
            $profile['textPreview'] = trim($textPreview);
        }

        return $profile;
    }

    private function parseAttributes(string $attributeFragment): array
    {
        $attributes = [];

        if (preg_match_all('/([a-zA-Z_:][a-zA-Z0-9:._-]*)(?:\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^"\'>\s`]+)))?/i', $attributeFragment, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $name = strtolower($match[1]);
                $value = $match[2] ?? $match[3] ?? $match[4] ?? true;
                $attributes[$name] = is_string($value) ? html_entity_decode($value, ENT_QUOTES, 'UTF-8') : $value;
            }
        }

        return $attributes;
    }

    private function scoreStructuralMatch(array $target, array $candidate): array
    {
        $score = 0;
        $reasons = [];

        if (($candidate['tagName'] ?? '') !== ($target['tagName'] ?? '')) {
            return ['confidence' => 0, 'reason' => null];
        }

        $score += 20;

        $targetAttrs = $target['attributes'] ?? [];
        $candidateAttrs = $candidate['attributes'] ?? [];

        foreach (['data-webby-section-id', 'data-webby-label', 'id', 'aria-label'] as $key) {
            $targetValue = $targetAttrs[$key] ?? null;
            $candidateValue = $candidateAttrs[$key] ?? null;
            if ($this->attributeMatches($targetValue, $candidateValue)) {
                $score += match ($key) {
                    'data-webby-section-id' => 50,
                    'data-webby-label' => 25,
                    'id' => 30,
                    'aria-label' => 10,
                    default => 0,
                };
                $reasons[] = "{$key} matches";
            }
        }

        $targetClasses = $this->classList($targetAttrs['class'] ?? null);
        $candidateClasses = $this->classList($candidateAttrs['class'] ?? null);
        $sharedClasses = array_intersect($targetClasses, $candidateClasses);

        if ($sharedClasses !== []) {
            $score += min(18, count($sharedClasses) * 6);
            $reasons[] = 'classes overlap';
        }

        $targetText = $this->normalizeText($target['text'] ?? '');
        $candidateText = $this->normalizeText($candidate['text'] ?? '');
        $targetPreview = $this->normalizeText((string) ($target['textPreview'] ?? ''));

        if ($targetText !== '' && $candidateText !== '') {
            if ($targetText === $candidateText) {
                $score += 30;
                $reasons[] = 'text matches';
            } elseif ($targetPreview !== '' && (str_contains($candidateText, $targetPreview) || str_contains($targetPreview, $candidateText))) {
                $score += 18;
                $reasons[] = 'text preview matches';
            }
        }

        if ($this->attributeMatches($targetAttrs['data-webby-label'] ?? null, $candidateAttrs['data-webby-label'] ?? null)) {
            $score += 25;
        }

        if ($score >= 100) {
            $score = 100;
        }

        return [
            'confidence' => $score,
            'reason' => $reasons !== [] ? implode(', ', $reasons) : 'Structural match',
        ];
    }

    private function normalizeText(string $text): string
    {
        $text = html_entity_decode($text, ENT_QUOTES, 'UTF-8');
        $text = preg_replace('/\s+/', ' ', trim($text)) ?? trim($text);

        return mb_strtolower($text);
    }

    private function classList(mixed $classes): array
    {
        if (! is_string($classes) || trim($classes) === '') {
            return [];
        }

        $parts = preg_split('/\s+/', trim($classes)) ?: [];

        return array_values(array_filter(array_map(fn (string $class) => mb_strtolower(trim($class)), $parts)));
    }

    private function attributeMatches(mixed $a, mixed $b): bool
    {
        if ($a === null || $b === null) {
            return false;
        }

        if ($a === true || $b === true) {
            return $a === $b;
        }

        return $this->normalizeText((string) $a) === $this->normalizeText((string) $b);
    }

    private function cleanText(string $value): string
    {
        return html_entity_decode(strip_tags($value), ENT_QUOTES, 'UTF-8');
    }

    private function listEditableSourcePaths(Project $project): array
    {
        $files = $this->usesLocalWorkspace($project)
            ? ($this->workspaceService->listFiles($project)['files'] ?? [])
            : ($this->builderService->getWorkspaceFiles($this->requireBuilder($project), (string) $project->id)['files'] ?? []);

        $paths = [];

        foreach ($files as $file) {
            $path = is_array($file) ? ($file['path'] ?? null) : null;
            $isDir = is_array($file) && (($file['is_dir'] ?? false) || ($file['isDir'] ?? false));

            if (! is_string($path) || $isDir || ! $this->isEditablePath($path)) {
                continue;
            }

            $paths[] = $path;
        }

        return array_values(array_unique($paths));
    }

    private function readSourceFile(Project $project, string $sourcePath): array
    {
        $sourcePath = $this->normalizeSourcePath($sourcePath);

        if ($this->usesLocalWorkspace($project)) {
            return $this->workspaceService->readFile($project, $sourcePath);
        }

        $file = $this->builderService->getFile($this->requireBuilder($project), (string) $project->id, $sourcePath);

        if (! isset($file['content']) || ! is_string($file['content'])) {
            throw new RuntimeException('Source file content was not returned by the builder.');
        }

        return [
            'path' => $sourcePath,
            'content' => $file['content'],
        ];
    }

    private function writeSourceFile(Project $project, string $sourcePath, string $content): void
    {
        $sourcePath = $this->normalizeSourcePath($sourcePath);

        if ($this->usesLocalWorkspace($project)) {
            $this->workspaceService->writeFile($project, $sourcePath, $content);

            return;
        }

        $success = $this->builderService->updateFile($this->requireBuilder($project), (string) $project->id, $sourcePath, $content);

        if (! $success) {
            throw new RuntimeException('Failed to update source file in builder workspace.');
        }
    }

    private function syncPreviewAfterWrite(Project $project): array
    {
        $previewUrl = "/preview/{$project->id}/";
        $warning = null;

        if ($this->usesLocalWorkspace($project)) {
            return [
                'preview_url' => $previewUrl,
                'warning' => null,
            ];
        }

        try {
            $result = $this->builderService->triggerBuild($this->requireBuilder($project), (string) $project->id, $project->id);
            $previewUrl = $result['preview_url'] ?? $previewUrl;
        } catch (\Throwable $e) {
            $warning = 'Source saved, but preview rebuild failed: '.Str::limit($e->getMessage(), 220);
        }

        return [
            'preview_url' => $previewUrl,
            'warning' => $warning,
        ];
    }

    private function normalizeSourcePath(string $path): string
    {
        $path = trim(str_replace('\\', '/', $path));
        $path = ltrim($path, '/');

        if ($path === '' || str_contains($path, "\0") || str_contains($path, '..')) {
            throw new InvalidArgumentException('Invalid source path.');
        }

        if (! $this->isEditablePath($path)) {
            throw new InvalidArgumentException('This source file type cannot be edited from the section code editor.');
        }

        return $path;
    }

    private function isEditablePath(string $path): bool
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return in_array($extension, self::EDITABLE_EXTENSIONS, true);
    }

    private function languageForPath(string $path): string
    {
        return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'tsx', 'ts' => 'typescript',
            'jsx', 'js' => 'javascript',
            'php' => 'php',
            'html', 'htm' => 'html',
            default => 'plaintext',
        };
    }

    private function usesLocalWorkspace(Project $project): bool
    {
        return $project->type === 'blank' && $project->builder === null;
    }

    private function requireBuilder(Project $project): \App\Models\Builder
    {
        if (! $project->builder) {
            throw new RuntimeException('No builder assigned to this project.');
        }

        return $project->builder;
    }

    private function snippetAround(string $content, ?string $search): string
    {
        if ($search === null || $search === '') {
            return Str::limit(trim(preg_replace('/\s+/', ' ', $content) ?? $content), 220);
        }

        $position = strpos($content, $search);

        if ($position === false) {
            return Str::limit(trim(preg_replace('/\s+/', ' ', $content) ?? $content), 220);
        }

        $start = max(0, $position - 80);
        $snippet = substr($content, $start, strlen($search) + 160);

        return Str::limit(trim(preg_replace('/\s+/', ' ', $snippet) ?? $snippet), 220);
    }
}
