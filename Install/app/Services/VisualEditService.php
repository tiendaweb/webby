<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class VisualEditService
{
    private const EDITABLE_EXTENSIONS = [
        'html', 'htm', 'php', 'jsx', 'tsx', 'js', 'ts', 'css', 'json',
    ];

    public function __construct(
        protected ProjectWorkspaceService $workspaceService,
        protected BuilderService $builderService,
    ) {}

    public function apply(Project $project, array $data): array
    {
        $data['originalValue'] = (string) ($data['originalValue'] ?? '');
        $data['newValue'] = (string) ($data['newValue'] ?? '');
        $data['originalValueAliases'] = $this->normalizeOriginalValueAliases($data['originalValueAliases'] ?? []);

        $sourcePath = isset($data['sourcePath']) && $data['sourcePath'] !== ''
            ? $this->normalizeSourcePath($data['sourcePath'])
            : null;

        if ($sourcePath !== null) {
            return $this->applyToSourcePath($project, $sourcePath, $data);
        }

        $candidates = $this->findCandidates($project, $data);

        if (count($candidates) === 1 && ($candidates[0]['occurrences'] ?? 0) === 1) {
            return $this->applyToSourcePath($project, $candidates[0]['sourcePath'], $data);
        }

        return [
            'success' => false,
            'needs_source_choice' => true,
            'candidates' => $candidates,
            'message' => count($candidates) === 0
                ? 'No matching source file was found for this visual edit.'
                : 'Choose the source file to update.',
        ];
    }

    private function applyToSourcePath(Project $project, string $sourcePath, array $data): array
    {
        $source = $this->readSourceFile($project, $sourcePath);
        $replacement = str_ends_with(strtolower($sourcePath), '.json')
            ? $this->buildJsonReplacement($project, $source['content'], $data)
            : $this->buildReplacement($project, $source['content'], $data);

        if (($replacement['occurrences'] ?? 0) !== 1 || ! isset($replacement['content'])) {
            throw new RuntimeException('The selected file does not contain a unique matching value for this edit.');
        }

        $this->writeSourceFile($project, $sourcePath, $replacement['content']);
        $build = $this->syncPreviewAfterWrite($project);

        return [
            'success' => true,
            'sourcePath' => $sourcePath,
            'preview_url' => $build['preview_url'],
            'warning' => $build['warning'],
        ];
    }

    private function findCandidates(Project $project, array $data): array
    {
        $candidates = [];

        foreach ($this->listEditableSourcePaths($project) as $sourcePath) {
            try {
                $source = $this->readSourceFile($project, $sourcePath);
            } catch (\Throwable) {
                continue;
            }

            if (str_contains($source['content'], "\0")) {
                continue;
            }

            $replacement = str_ends_with(strtolower($sourcePath), '.json')
                ? $this->buildJsonReplacement($project, $source['content'], $data)
                : $this->buildReplacement($project, $source['content'], $data);
            $occurrences = $replacement['occurrences'] ?? 0;

            if ($occurrences < 1) {
                continue;
            }

            $candidates[] = [
                'sourcePath' => $sourcePath,
                'occurrences' => $occurrences,
                'snippet' => $this->snippetAround($source['content'], $replacement['search'] ?? $data['originalValue']),
            ];

            if (count($candidates) >= 25) {
                break;
            }
        }

        return $candidates;
    }

    private function buildReplacement(Project $project, string $content, array $data): array
    {
        foreach ($this->replacementPatternGroups($project, $data) as $matches) {
            $replacement = $this->buildReplacementFromPatterns($content, $matches);

            if (($replacement['occurrences'] ?? 0) > 0) {
                return $replacement;
            }
        }

        return [
            'occurrences' => 0,
            'search' => null,
        ];
    }

    private function buildJsonReplacement(Project $project, string $content, array $data): array
    {
        $decoded = json_decode($content, true);

        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($decoded)) {
            return $this->buildReplacement($project, $content, $data);
        }

        $originals = $this->originalSearchValues($project, $data);
        $new = (string) $data['newValue'];
        $occurrences = 0;
        $matchedOriginal = null;

        $updated = $this->replaceJsonStringValue($decoded, $originals, $new, $occurrences, $matchedOriginal);

        if ($occurrences !== 1) {
            return [
                'occurrences' => $occurrences,
                'search' => $matchedOriginal ?? ($originals[0] ?? (string) $data['originalValue']),
            ];
        }

        $encoded = json_encode($updated, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        if (! is_string($encoded)) {
            return [
                'occurrences' => 0,
                'search' => $matchedOriginal ?? ($originals[0] ?? (string) $data['originalValue']),
            ];
        }

        return [
            'occurrences' => 1,
            'search' => $matchedOriginal ?? ($originals[0] ?? (string) $data['originalValue']),
            'content' => $encoded."\n",
        ];
    }

    private function replaceJsonStringValue(mixed $value, array $originals, string $new, int &$occurrences, ?string &$matchedOriginal): mixed
    {
        if (is_string($value)) {
            foreach ($originals as $original) {
                if ($value === $original) {
                    $occurrences++;
                    $matchedOriginal ??= $original;

                    return $new;
                }
            }

            return $value;
        }

        if (! is_array($value)) {
            return $value;
        }

        foreach ($value as $key => $child) {
            $value[$key] = $this->replaceJsonStringValue($child, $originals, $new, $occurrences, $matchedOriginal);
        }

        return $value;
    }

    private function buildReplacementFromPatterns(string $content, array $matches): array
    {
        usort($matches, fn (array $a, array $b) => strlen($b['search']) <=> strlen($a['search']));

        $ranges = [];

        foreach ($matches as $match) {
            if ($match['search'] === '') {
                continue;
            }

            $offset = 0;
            while (($position = strpos($content, $match['search'], $offset)) !== false) {
                $end = $position + strlen($match['search']);
                $offset = $position + 1;

                if ($this->rangeOverlaps($ranges, $position, $end)) {
                    continue;
                }

                $ranges[] = [
                    'start' => $position,
                    'end' => $end,
                    'match' => $match,
                ];
            }
        }

        if (count($ranges) !== 1) {
            return [
                'occurrences' => count($ranges),
                'search' => $ranges[0]['match']['search'] ?? null,
            ];
        }

        $selected = $ranges[0]['match'];

        return [
            'occurrences' => 1,
            'search' => $selected['search'],
            'content' => Str::replaceFirst($selected['search'], $selected['replace'], $content),
        ];
    }

    private function rangeOverlaps(array $ranges, int $start, int $end): bool
    {
        foreach ($ranges as $range) {
            if ($start < $range['end'] && $end > $range['start']) {
                return true;
            }
        }

        return false;
    }

    private function replacementPatternGroups(Project $project, array $data): array
    {
        $field = $data['field'];
        $originals = $this->originalSearchValues($project, $data);
        $new = (string) $data['newValue'];

        if ($field !== 'text') {
            $attributePatterns = [];

            foreach ($originals as $original) {
                foreach ($this->attributeValueVariants($original) as $value) {
                    $doubleQuotedValue = $this->escapeAttribute($new, '"');
                    $singleQuotedValue = $this->escapeAttribute($new, "'");

                    $attributePatterns[] = [
                        'search' => "{$field}=\"{$value}\"",
                        'replace' => "{$field}=\"{$doubleQuotedValue}\"",
                    ];
                    $attributePatterns[] = [
                        'search' => "{$field}='{$value}'",
                        'replace' => "{$field}='{$singleQuotedValue}'",
                    ];
                }
            }

            return [
                $this->uniquePatterns($attributePatterns),
                $this->uniquePatterns($this->fallbackValuePatterns($originals, $new, false)),
            ];
        }

        return [
            $this->uniquePatterns($this->fallbackValuePatterns($originals, $new, true)),
        ];
    }

    private function fallbackValuePatterns(array $originals, string $new, bool $escapeText): array
    {
        $patterns = [];

        foreach ($originals as $original) {
            foreach ($this->textValueVariants($original) as $value) {
                $patterns[] = [
                    'search' => $value,
                    'replace' => $escapeText ? $this->escapeText($new, $value) : $new,
                ];
            }
        }

        return $patterns;
    }

    private function normalizeOriginalValueAliases(mixed $aliases): array
    {
        if (! is_array($aliases)) {
            return [];
        }

        return array_values(array_unique(array_filter(
            array_map(fn ($value) => is_scalar($value) ? (string) $value : '', $aliases),
            fn (string $value) => $value !== ''
        )));
    }

    private function originalSearchValues(Project $project, array $data): array
    {
        $values = [(string) $data['originalValue'], ...($data['originalValueAliases'] ?? [])];
        $variants = [];

        foreach ($values as $value) {
            foreach ($this->sourceValueVariants($project, (string) $value) as $variant) {
                if ($variant !== '') {
                    $variants[] = $variant;
                }
            }
        }

        return array_values(array_unique($variants));
    }

    private function sourceValueVariants(Project $project, string $value): array
    {
        $variants = [$value];
        $decoded = html_entity_decode($value, ENT_QUOTES, 'UTF-8');
        $variants[] = $decoded;
        $variants[] = rawurldecode($decoded);

        foreach (array_values(array_unique($variants)) as $candidate) {
            $withoutSuffix = preg_replace('/[?#].*$/', '', $candidate) ?? $candidate;
            $variants[] = $withoutSuffix;

            $path = parse_url($candidate, PHP_URL_PATH);
            if (is_string($path) && $path !== '') {
                $variants[] = $path;
                $variants[] = ltrim($path, '/');
                $variants = array_merge($variants, $this->projectRelativeUrlVariants($project, $path));
            }
        }

        foreach (array_values(array_unique($variants)) as $candidate) {
            if (str_starts_with($candidate, '/')) {
                $relative = ltrim($candidate, '/');
                $variants[] = $relative;
                $variants[] = './'.$relative;
            } elseif ($candidate !== '' && ! str_starts_with($candidate, './') && ! preg_match('#^[a-z]+://#i', $candidate)) {
                $variants[] = './'.$candidate;
            }
        }

        return array_values(array_unique(array_filter($variants, fn (string $variant) => $variant !== '')));
    }

    private function projectRelativeUrlVariants(Project $project, string $path): array
    {
        $projectId = (string) $project->id;
        $normalized = '/'.ltrim($path, '/');
        $variants = [];

        foreach ([
            "/preview/{$projectId}/",
            "/app/{$projectId}/",
            "/api/files/{$projectId}/",
        ] as $prefix) {
            if (str_starts_with($normalized, $prefix)) {
                $relative = substr($normalized, strlen($prefix));
                $variants[] = $relative;
                $variants[] = './'.$relative;
            }
        }

        return $variants;
    }

    private function attributeValueVariants(string $value): array
    {
        return array_values(array_unique([
            $value,
            htmlspecialchars($value, ENT_QUOTES, 'UTF-8', false),
        ]));
    }

    private function textValueVariants(string $value): array
    {
        if ($value === '') {
            return [];
        }

        return array_values(array_unique([
            $value,
            htmlspecialchars($value, ENT_QUOTES, 'UTF-8', false),
        ]));
    }

    private function uniquePatterns(array $patterns): array
    {
        $seen = [];
        $unique = [];

        foreach ($patterns as $pattern) {
            $key = $pattern['search'];
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $unique[] = $pattern;
        }

        return $unique;
    }

    private function escapeAttribute(string $value, string $quote): string
    {
        $escaped = htmlspecialchars($value, ENT_QUOTES, 'UTF-8', false);

        return $quote === "'"
            ? str_replace('&#039;', '&apos;', $escaped)
            : $escaped;
    }

    private function escapeText(string $newValue, string $matchedOriginal): string
    {
        if ($matchedOriginal === htmlspecialchars_decode($matchedOriginal, ENT_QUOTES)) {
            return $newValue;
        }

        return htmlspecialchars($newValue, ENT_QUOTES, 'UTF-8', false);
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
            throw new InvalidArgumentException('This source file type cannot be edited visually.');
        }

        return $path;
    }

    private function isEditablePath(string $path): bool
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return in_array($extension, self::EDITABLE_EXTENSIONS, true);
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
            return Str::limit(trim($content), 160);
        }

        $position = strpos($content, $search);

        if ($position === false) {
            return Str::limit(trim($content), 160);
        }

        $start = max(0, $position - 80);
        $snippet = substr($content, $start, strlen($search) + 160);

        return Str::limit(trim(preg_replace('/\s+/', ' ', $snippet) ?? $snippet), 220);
    }
}
