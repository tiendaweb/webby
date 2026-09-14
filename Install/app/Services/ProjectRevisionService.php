<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectRevision;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class ProjectRevisionService
{
    private const MAX_FILE_BYTES = 10_000_000;
    private const MAX_TOTAL_BYTES = 80_000_000;

    private const SNAPSHOT_EXTENSIONS = [
        'html', 'htm', 'css', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx',
        'php', 'json', 'txt', 'md', 'xml', 'svg', 'webmanifest',
        'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico',
    ];

    public function __construct(
        protected ProjectWorkspaceService $workspaceService,
        protected BuilderService $builderService,
    ) {}

    public function create(Project $project, ?User $user, string $trigger, string $label, array $metadata = []): ProjectRevision
    {
        $revision = ProjectRevision::create([
            'project_id' => $project->id,
            'user_id' => $user?->id,
            'trigger' => $trigger,
            'label' => $label,
            'manifest' => [
                'source' => 'pending',
                'files' => [],
                'skipped' => [],
                'total_bytes' => 0,
            ],
            'metadata' => $metadata,
        ]);

        $manifest = $this->snapshotBuilderWorkspace($project, $revision)
            ?? $this->snapshotLocalWorkspace($project, $revision);

        $revision->update([
            'manifest' => $manifest ?? [
                'source' => 'empty',
                'files' => [],
                'skipped' => [],
                'total_bytes' => 0,
            ],
        ]);

        $this->prune($project);

        return $revision->fresh();
    }

    public function restore(ProjectRevision $revision): array
    {
        $project = $revision->project;
        $manifest = $revision->manifest ?? [];
        $source = (string) ($manifest['source'] ?? 'empty');
        $files = is_array($manifest['files'] ?? null) ? $manifest['files'] : [];

        if ($files === []) {
            throw new RuntimeException('This revision does not contain restorable files.');
        }

        if ($source === 'builder' && $project->builder) {
            $restored = $this->restoreBuilderWorkspace($project, $revision, $files);
        } else {
            $restored = $this->restoreLocalWorkspace($project, $revision, $files);
        }

        $revision->update(['restored_at' => now()]);

        return [
            'success' => true,
            'restored_files' => $restored,
            'preview_url' => Storage::disk('local')->exists("previews/{$project->id}")
                ? "/preview/{$project->id}/"
                : null,
        ];
    }

    public function payload(ProjectRevision $revision): array
    {
        $manifest = $revision->manifest ?? [];
        $files = is_array($manifest['files'] ?? null) ? $manifest['files'] : [];
        $skipped = is_array($manifest['skipped'] ?? null) ? $manifest['skipped'] : [];

        return [
            'id' => $revision->id,
            'trigger' => $revision->trigger,
            'label' => $revision->label,
            'file_count' => count($files),
            'skipped_count' => count($skipped),
            'total_bytes' => (int) ($manifest['total_bytes'] ?? 0),
            'source' => $manifest['source'] ?? 'empty',
            'metadata' => $revision->metadata ?? [],
            'restored_at' => $revision->restored_at?->toIso8601String(),
            'created_at' => $revision->created_at?->toIso8601String(),
            'user' => $revision->user ? [
                'id' => $revision->user->id,
                'name' => $revision->user->name,
            ] : null,
        ];
    }

    private function snapshotLocalWorkspace(Project $project, ProjectRevision $revision): ?array
    {
        $disk = Storage::disk('local');
        $root = $this->workspaceService->root($project);

        if (! $disk->exists($root)) {
            return null;
        }

        $manifest = $this->emptyManifest('local');
        $base = $this->snapshotBasePath($project, $revision);

        foreach ($disk->allFiles($root) as $file) {
            $relative = ltrim(Str::after($file, $root), '/');
            $this->snapshotContent($revision, $manifest, $relative, fn () => $disk->get($file), $disk->size($file), $base);
        }

        return $manifest;
    }

    private function snapshotBuilderWorkspace(Project $project, ProjectRevision $revision): ?array
    {
        if (! $project->builder) {
            return null;
        }

        try {
            $payload = $this->builderService->getWorkspaceFiles($project->builder, $project->id);
        } catch (\Throwable) {
            return null;
        }

        $entries = is_array($payload['files'] ?? null) ? $payload['files'] : [];
        if ($entries === []) {
            return null;
        }

        $manifest = $this->emptyManifest('builder');
        $base = $this->snapshotBasePath($project, $revision);

        foreach ($entries as $entry) {
            $path = (string) ($entry['path'] ?? '');
            $isDir = (bool) ($entry['is_dir'] ?? $entry['isDir'] ?? false);
            if ($path === '' || $isDir) {
                continue;
            }

            $size = isset($entry['size']) ? (int) $entry['size'] : null;
            $this->snapshotContent(
                $revision,
                $manifest,
                $path,
                fn () => (string) ($this->builderService->getFile($project->builder, $project->id, $path)['content'] ?? ''),
                $size,
                $base
            );
        }

        return $manifest;
    }

    private function snapshotContent(ProjectRevision $revision, array &$manifest, string $relative, callable $content, ?int $knownSize, string $base): void
    {
        $relative = ltrim(str_replace('\\', '/', $relative), '/');

        if ($relative === '' || ! $this->isSnapshotPath($relative)) {
            return;
        }

        if ($knownSize !== null && $knownSize > self::MAX_FILE_BYTES) {
            $manifest['skipped'][] = ['path' => $relative, 'reason' => 'too_large'];
            return;
        }

        if (($manifest['total_bytes'] + ($knownSize ?? 0)) > self::MAX_TOTAL_BYTES) {
            $manifest['skipped'][] = ['path' => $relative, 'reason' => 'snapshot_limit'];
            return;
        }

        try {
            $bytes = (string) $content();
        } catch (\Throwable) {
            $manifest['skipped'][] = ['path' => $relative, 'reason' => 'read_failed'];
            return;
        }

        $size = strlen($bytes);
        if ($size > self::MAX_FILE_BYTES || ($manifest['total_bytes'] + $size) > self::MAX_TOTAL_BYTES) {
            $manifest['skipped'][] = ['path' => $relative, 'reason' => 'too_large'];
            return;
        }

        $snapshotPath = "{$base}/files/{$relative}";
        Storage::disk('local')->put($snapshotPath, $bytes);

        $manifest['files'][] = [
            'path' => $relative,
            'snapshot_path' => $snapshotPath,
            'size' => $size,
            'checksum' => hash('sha256', $bytes),
        ];
        $manifest['total_bytes'] += $size;
    }

    private function restoreLocalWorkspace(Project $project, ProjectRevision $revision, array $files): int
    {
        $disk = Storage::disk('local');
        $root = $this->workspaceService->root($project);
        $disk->deleteDirectory($root);
        $disk->makeDirectory($root);

        $count = 0;
        foreach ($files as $file) {
            $relative = (string) ($file['path'] ?? '');
            $snapshotPath = (string) ($file['snapshot_path'] ?? '');
            if ($relative === '' || $snapshotPath === '' || ! $disk->exists($snapshotPath)) {
                continue;
            }

            $disk->put("{$root}/{$relative}", $disk->get($snapshotPath));
            $count++;
        }

        $this->workspaceService->syncPreview($project);

        return $count;
    }

    private function restoreBuilderWorkspace(Project $project, ProjectRevision $revision, array $files): int
    {
        $disk = Storage::disk('local');
        $count = 0;

        foreach ($files as $file) {
            $relative = (string) ($file['path'] ?? '');
            $snapshotPath = (string) ($file['snapshot_path'] ?? '');
            if ($relative === '' || $snapshotPath === '' || ! $disk->exists($snapshotPath)) {
                continue;
            }

            if ($this->builderService->updateFile($project->builder, $project->id, $relative, $disk->get($snapshotPath))) {
                $count++;
            }
        }

        if ($count > 0) {
            $this->builderService->triggerBuild($project->builder, $project->id, $project->id);
        }

        return $count;
    }

    private function emptyManifest(string $source): array
    {
        return [
            'source' => $source,
            'files' => [],
            'skipped' => [],
            'total_bytes' => 0,
        ];
    }

    private function snapshotBasePath(Project $project, ProjectRevision $revision): string
    {
        return "project-revisions/{$project->id}/{$revision->id}";
    }

    private function isSnapshotPath(string $path): bool
    {
        if (preg_match('#(^|/)(node_modules|vendor|\.git|storage|dist|build)(/|$)#i', $path)) {
            return false;
        }

        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return in_array($extension, self::SNAPSHOT_EXTENSIONS, true);
    }

    private function prune(Project $project): void
    {
        $stale = $project->revisions()
            ->latest()
            ->skip(30)
            ->take(1000)
            ->get();

        foreach ($stale as $revision) {
            Storage::disk('local')->deleteDirectory($this->snapshotBasePath($project, $revision));
            $revision->delete();
        }
    }
}
