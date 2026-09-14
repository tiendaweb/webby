<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class ProjectStructureService
{
    private const PAGE_EXTENSIONS = ['html', 'htm', 'php', 'jsx', 'tsx', 'js', 'ts'];
    private const SECTION_TAGS = ['header', 'main', 'section', 'article', 'footer', 'nav', 'aside'];

    public function __construct(
        protected ProjectWorkspaceService $workspaceService,
        protected BuilderService $builderService,
    ) {}

    public function structure(Project $project): array
    {
        $pages = [];

        foreach ($this->sourcePaths($project) as $sourcePath) {
            try {
                $content = $this->readSource($project, $sourcePath);
            } catch (\Throwable) {
                continue;
            }

            $pages[] = [
                'path' => $sourcePath,
                'name' => $this->pageName($sourcePath),
                'title' => $this->pageTitle($content) ?? $this->pageName($sourcePath),
                'sections' => array_map(fn (array $block) => $this->nodePayload($sourcePath, $block), $this->extractBlocks($content, $sourcePath)),
            ];
        }

        return [
            'pages' => $pages,
        ];
    }

    public function applyAction(Project $project, array $data): array
    {
        $sourcePath = $this->normalizeSourcePath((string) ($data['sourcePath'] ?? ''));
        $nodeId = (string) ($data['nodeId'] ?? '');
        $action = (string) ($data['action'] ?? '');
        $label = trim((string) ($data['label'] ?? ''));

        if ($nodeId === '') {
            throw new InvalidArgumentException('A section is required.');
        }

        $content = $this->readSource($project, $sourcePath);
        $blocks = $this->extractBlocks($content, $sourcePath);
        $index = $this->findBlockIndex($blocks, $nodeId);

        if ($index === null) {
            throw new RuntimeException('The selected section could not be found.');
        }

        $updated = match ($action) {
            'duplicate' => $this->duplicateBlock($content, $blocks[$index]),
            'delete' => $this->deleteBlock($content, $blocks[$index]),
            'hide' => $this->replaceBlock($content, $blocks[$index], $this->hideBlock($blocks[$index]['code'])),
            'rename' => $this->replaceBlock($content, $blocks[$index], $this->renameBlock($blocks[$index]['code'], $label)),
            'move_up' => $this->moveBlock($content, $blocks, $index, -1),
            'move_down' => $this->moveBlock($content, $blocks, $index, 1),
            'add_after' => $this->addAfter($content, $blocks[$index], $label),
            default => throw new InvalidArgumentException('Unsupported section action.'),
        };

        $this->writeSource($project, $sourcePath, $updated);

        return [
            'success' => true,
            'sourcePath' => $sourcePath,
            'preview_url' => Storage::disk('local')->exists("previews/{$project->id}")
                ? "/preview/{$project->id}/"
                : null,
            'structure' => $this->structure($project),
        ];
    }

    public function sourcePaths(Project $project): array
    {
        $paths = [];

        if ($project->builder) {
            try {
                $payload = $this->builderService->getWorkspaceFiles($project->builder, $project->id);
                foreach (($payload['files'] ?? []) as $entry) {
                    if ((bool) ($entry['is_dir'] ?? $entry['isDir'] ?? false)) {
                        continue;
                    }

                    $path = (string) ($entry['path'] ?? '');
                    if ($this->isEditablePagePath($path)) {
                        $paths[] = $path;
                    }
                }
            } catch (\Throwable) {
                return [];
            }
        } else {
            $root = $this->workspaceService->root($project);
            if (! Storage::disk('local')->exists($root)) {
                return [];
            }

            foreach (Storage::disk('local')->allFiles($root) as $file) {
                $path = ltrim(Str::after($file, $root), '/');
                if ($this->isEditablePagePath($path)) {
                    $paths[] = $path;
                }
            }
        }

        usort($paths, function (string $a, string $b) {
            if ($a === 'index.html') {
                return -1;
            }

            if ($b === 'index.html') {
                return 1;
            }

            return $a <=> $b;
        });

        return array_values(array_unique($paths));
    }

    public function readSource(Project $project, string $sourcePath): string
    {
        $sourcePath = $this->normalizeSourcePath($sourcePath);

        if ($project->builder) {
            return (string) ($this->builderService->getFile($project->builder, $project->id, $sourcePath)['content'] ?? '');
        }

        return $this->workspaceService->readFile($project, $sourcePath)['content'];
    }

    public function writeSource(Project $project, string $sourcePath, string $content): void
    {
        $sourcePath = $this->normalizeSourcePath($sourcePath);

        if ($project->builder) {
            if (! $this->builderService->updateFile($project->builder, $project->id, $sourcePath, $content)) {
                throw new RuntimeException('Failed to update source file.');
            }

            $this->builderService->triggerBuild($project->builder, $project->id, $project->id);

            return;
        }

        $this->workspaceService->writeFile($project, $sourcePath, $content);
    }

    public function normalizeSourcePath(string $sourcePath): string
    {
        $sourcePath = trim(str_replace('\\', '/', $sourcePath));
        $sourcePath = ltrim($sourcePath, '/');

        if ($sourcePath === '' || str_contains($sourcePath, '..') || str_contains($sourcePath, "\0")) {
            throw new InvalidArgumentException('Invalid source path.');
        }

        if (! $this->isEditablePagePath($sourcePath)) {
            throw new InvalidArgumentException('This file cannot be edited as a page.');
        }

        return $sourcePath;
    }

    private function extractBlocks(string $content, string $sourcePath): array
    {
        $blocks = [];
        $pattern = '#<('.implode('|', self::SECTION_TAGS).')\b[^>]*>.*?</\1>#is';

        if (! preg_match_all($pattern, $content, $matches, PREG_OFFSET_CAPTURE)) {
            return [];
        }

        foreach ($matches[0] as $index => $match) {
            $code = $match[0];
            $start = $match[1];
            $tag = strtolower($matches[1][$index][0]);

            $blocks[] = [
                'id' => $this->blockId($sourcePath, $index, $tag, $code),
                'index' => $index,
                'tag' => $tag,
                'start' => $start,
                'end' => $start + strlen($code),
                'code' => $code,
                'title' => $this->blockTitle($code, $tag, $index),
                'textPreview' => $this->textPreview($code),
                'hidden' => preg_match('/display\s*:\s*none/i', $code) === 1,
            ];
        }

        return $blocks;
    }

    private function nodePayload(string $sourcePath, array $block): array
    {
        return [
            'id' => $block['id'],
            'sourcePath' => $sourcePath,
            'index' => $block['index'],
            'tagName' => $block['tag'],
            'title' => $block['title'],
            'textPreview' => $block['textPreview'],
            'hidden' => $block['hidden'],
        ];
    }

    private function findBlockIndex(array $blocks, string $nodeId): ?int
    {
        foreach ($blocks as $index => $block) {
            if ($block['id'] === $nodeId) {
                return $index;
            }
        }

        return null;
    }

    private function duplicateBlock(string $content, array $block): string
    {
        return substr($content, 0, $block['end'])."\n".$block['code'].substr($content, $block['end']);
    }

    private function deleteBlock(string $content, array $block): string
    {
        return substr($content, 0, $block['start']).substr($content, $block['end']);
    }

    private function replaceBlock(string $content, array $block, string $replacement): string
    {
        return substr($content, 0, $block['start']).$replacement.substr($content, $block['end']);
    }

    private function hideBlock(string $code): string
    {
        if (preg_match('/^<([a-z0-9:-]+)([^>]*)>/i', $code, $match) !== 1) {
            return $code;
        }

        $opening = $match[0];
        if (preg_match('/\sstyle=(["\'])(.*?)\1/i', $opening, $style) === 1) {
            $updatedOpening = str_replace($style[0], ' style='.$style[1].rtrim($style[2], ';').'; display: none;'.$style[1], $opening);
        } else {
            $updatedOpening = rtrim($opening, '>').' style="display: none;">';
        }

        return Str::replaceFirst($opening, $updatedOpening, $code);
    }

    private function renameBlock(string $code, string $label): string
    {
        if ($label === '') {
            throw new InvalidArgumentException('A section name is required.');
        }

        if (preg_match('/^<([a-z0-9:-]+)([^>]*)>/i', $code, $match) !== 1) {
            return $code;
        }

        $opening = $match[0];
        $escaped = htmlspecialchars($label, ENT_QUOTES, 'UTF-8');

        if (preg_match('/\sdata-webby-label=(["\'])(.*?)\1/i', $opening, $labelMatch) === 1) {
            $updatedOpening = str_replace($labelMatch[0], ' data-webby-label="'.$escaped.'"', $opening);
        } else {
            $updatedOpening = rtrim($opening, '>').' data-webby-label="'.$escaped.'">';
        }

        return Str::replaceFirst($opening, $updatedOpening, $code);
    }

    private function moveBlock(string $content, array $blocks, int $index, int $direction): string
    {
        $targetIndex = $index + $direction;
        if (! isset($blocks[$targetIndex])) {
            return $content;
        }

        $first = $direction < 0 ? $blocks[$targetIndex] : $blocks[$index];
        $second = $direction < 0 ? $blocks[$index] : $blocks[$targetIndex];

        if ($first['end'] > $second['start']) {
            return $content;
        }

        $before = substr($content, 0, $first['start']);
        $between = substr($content, $first['end'], $second['start'] - $first['end']);
        $after = substr($content, $second['end']);

        return $before.$second['code'].$between.$first['code'].$after;
    }

    private function addAfter(string $content, array $block, string $label): string
    {
        $title = $label !== '' ? $label : 'Nueva sección';
        $escaped = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
        $section = <<<HTML

<section data-webby-label="{$escaped}">
    <div>
        <h2>{$escaped}</h2>
        <p>Edita esta sección desde Webby.</p>
    </div>
</section>
HTML;

        return substr($content, 0, $block['end']).$section.substr($content, $block['end']);
    }

    private function blockId(string $sourcePath, int $index, string $tag, string $code): string
    {
        if (preg_match('/\sdata-webby-section-id=(["\'])(.*?)\1/i', $code, $match) === 1) {
            return 'section-'.$match[2];
        }

        return 'section-'.sha1($sourcePath.'|'.$index.'|'.$tag.'|'.$this->textPreview($code));
    }

    private function blockTitle(string $code, string $tag, int $index): string
    {
        foreach (['data-webby-label', 'aria-label', 'id'] as $attribute) {
            if (preg_match('/\s'.preg_quote($attribute, '/').'=(["\'])(.*?)\1/i', $code, $match) === 1 && trim($match[2]) !== '') {
                return trim(html_entity_decode($match[2], ENT_QUOTES, 'UTF-8'));
            }
        }

        if (preg_match('/<h[1-6]\b[^>]*>(.*?)<\/h[1-6]>/is', $code, $match) === 1) {
            $heading = trim($this->cleanText($match[1]));
            if ($heading !== '') {
                return Str::limit($heading, 60);
            }
        }

        return Str::ucfirst($tag).' '.($index + 1);
    }

    private function pageTitle(string $content): ?string
    {
        if (preg_match('/<title[^>]*>(.*?)<\/title>/is', $content, $match) !== 1) {
            return null;
        }

        $title = trim($this->cleanText($match[1]));

        return $title !== '' ? $title : null;
    }

    private function textPreview(string $code): string
    {
        return Str::limit(trim(preg_replace('/\s+/', ' ', $this->cleanText($code)) ?? ''), 120);
    }

    private function cleanText(string $value): string
    {
        return html_entity_decode(strip_tags($value), ENT_QUOTES, 'UTF-8');
    }

    private function pageName(string $path): string
    {
        if ($path === 'index.html') {
            return 'Home';
        }

        return Str::headline(pathinfo($path, PATHINFO_FILENAME));
    }

    private function isEditablePagePath(string $path): bool
    {
        if ($path === '' || preg_match('#(^|/)(node_modules|vendor|\.git|dist|build)(/|$)#i', $path)) {
            return false;
        }

        return in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), self::PAGE_EXTENSIONS, true);
    }
}
