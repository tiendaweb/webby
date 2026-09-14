<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Str;
use RuntimeException;

class ProjectColorScanService
{
    private const SCANNABLE_EXTENSIONS = ['css', 'html', 'htm', 'php', 'jsx', 'tsx', 'js', 'ts'];
    private const MAX_FILE_BYTES = 600_000;

    public function __construct(
        protected ProjectWorkspaceService $workspaceService,
        protected BuilderService $builderService,
    ) {}

    public function scan(Project $project): array
    {
        $colors = [];

        foreach ($this->listSourcePaths($project) as $path) {
            $source = $this->readSource($project, $path);
            if ($source === null) {
                continue;
            }

            foreach ($this->extractColors($source, $path) as $item) {
                $key = $item['type'].'|'.$item['token'].'|'.$item['value'];
                $colors[$key] ??= [
                    'id' => sha1($key),
                    'type' => $item['type'],
                    'token' => $item['token'],
                    'value' => $item['value'],
                    'label' => $item['label'],
                    'files' => [],
                    'count' => 0,
                ];
                $colors[$key]['files'][$path] = ($colors[$key]['files'][$path] ?? 0) + 1;
                $colors[$key]['count']++;
            }
        }

        return array_values(array_map(function (array $color) {
            $color['files'] = collect($color['files'])
                ->map(fn (int $count, string $path) => ['path' => $path, 'count' => $count])
                ->values()
                ->all();

            return $color;
        }, $colors));
    }

    public function replace(Project $project, array $data): array
    {
        $path = $this->normalizePath($data['sourcePath']);
        $token = (string) $data['token'];
        $type = (string) $data['type'];
        $newValue = trim((string) $data['newValue']);

        if ($token === '' || $newValue === '') {
            throw new RuntimeException('Invalid color replacement.');
        }

        $source = $this->readSource($project, $path);
        if ($source === null) {
            throw new RuntimeException('Source file not found.');
        }

        $replacement = $this->replacementFor($type, $token, $newValue);
        $occurrences = substr_count($source, $token);

        if ($occurrences !== 1) {
            throw new RuntimeException($occurrences === 0
                ? 'The selected color token was not found.'
                : 'The selected file contains this color multiple times. Choose a more specific token.');
        }

        $this->writeSource($project, $path, Str::replaceFirst($token, $replacement, $source));
        $build = $this->syncPreview($project);

        return [
            'success' => true,
            'sourcePath' => $path,
            'preview_url' => $build['preview_url'],
            'warning' => $build['warning'],
        ];
    }

    private function extractColors(string $content, string $path): array
    {
        $items = [];

        $patterns = [
            'hex' => '/#[0-9a-fA-F]{3,8}\b/',
            'function' => '/\b(?:rgba?|hsla?|oklch)\([^)]+\)/i',
            'tailwind' => '/\b(?:bg|text|border|from|to|via|ring|outline|decoration|accent|caret|fill|stroke)-(?:\[[^\]]+\]|[a-z]+(?:-[0-9]{2,3})?)(?:\/[0-9]{1,3})?\b/',
        ];

        foreach ($patterns as $type => $pattern) {
            preg_match_all($pattern, $content, $matches);

            foreach (array_unique($matches[0] ?? []) as $token) {
                $items[] = [
                    'type' => $type === 'function' ? 'css-function' : $type,
                    'token' => $token,
                    'value' => $token,
                    'label' => $path,
                ];
            }
        }

        preg_match_all('/(--[A-Za-z0-9_-]+)\s*:\s*([^;}{]+)/', $content, $matches, PREG_SET_ORDER);
        foreach ($matches as $match) {
            $declaration = $match[0];
            $name = $match[1];
            $value = trim($match[2]);

            if ($value === '' || str_contains($value, 'var(')) {
                continue;
            }

            $items[] = [
                'type' => 'css-variable',
                'token' => $declaration,
                'value' => $value,
                'label' => $name,
            ];
        }

        return $items;
    }

    private function replacementFor(string $type, string $token, string $newValue): string
    {
        if ($type === 'css-variable' && preg_match('/^(--[A-Za-z0-9_-]+)\s*:/', $token, $match)) {
            return "{$match[1]}: {$newValue}";
        }

        return $newValue;
    }

    private function listSourcePaths(Project $project): array
    {
        $files = $this->usesLocalWorkspace($project)
            ? ($this->workspaceService->listFiles($project)['files'] ?? [])
            : ($this->builderService->getWorkspaceFiles($this->requireBuilder($project), (string) $project->id)['files'] ?? []);

        $paths = [];

        foreach ($files as $file) {
            $path = is_array($file) ? ($file['path'] ?? null) : null;
            $isDir = is_array($file) && (($file['is_dir'] ?? false) || ($file['isDir'] ?? false));

            if (! is_string($path) || $isDir || ! $this->isScannablePath($path)) {
                continue;
            }

            $paths[] = $path;
        }

        return array_values(array_unique($paths));
    }

    private function readSource(Project $project, string $path): ?string
    {
        try {
            if ($this->usesLocalWorkspace($project)) {
                $file = $this->workspaceService->readFile($project, $path);
            } else {
                $file = $this->builderService->getFile($this->requireBuilder($project), (string) $project->id, $path);
            }
        } catch (\Throwable) {
            return null;
        }

        $content = $file['content'] ?? null;
        if (! is_string($content) || strlen($content) > self::MAX_FILE_BYTES || str_contains($content, "\0")) {
            return null;
        }

        return $content;
    }

    private function writeSource(Project $project, string $path, string $content): void
    {
        if ($this->usesLocalWorkspace($project)) {
            $this->workspaceService->writeFile($project, $path, $content);

            return;
        }

        if (! $this->builderService->updateFile($this->requireBuilder($project), (string) $project->id, $path, $content)) {
            throw new RuntimeException('Failed to update source file.');
        }
    }

    private function syncPreview(Project $project): array
    {
        $previewUrl = "/preview/{$project->id}/";
        $warning = null;

        if (! $this->usesLocalWorkspace($project)) {
            try {
                $result = $this->builderService->triggerBuild($this->requireBuilder($project), (string) $project->id, $project->id);
                $previewUrl = $result['preview_url'] ?? $previewUrl;
            } catch (\Throwable $e) {
                $warning = 'Source saved, but preview rebuild failed: '.Str::limit($e->getMessage(), 220);
            }
        }

        return ['preview_url' => $previewUrl, 'warning' => $warning];
    }

    private function normalizePath(string $path): string
    {
        $path = trim(str_replace('\\', '/', $path));
        $path = ltrim($path, '/');

        if ($path === '' || str_contains($path, "\0") || str_contains($path, '..') || ! $this->isScannablePath($path)) {
            throw new RuntimeException('Invalid source path.');
        }

        return $path;
    }

    private function isScannablePath(string $path): bool
    {
        return in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), self::SCANNABLE_EXTENSIONS, true);
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
}
