<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

/**
 * Multi-file write. A whole site is usually several files that only make
 * sense together (page + stylesheet + script), so writing them one call at
 * a time leaves the published site broken in between — this writes the set
 * and syncs the preview once at the end.
 */
class AdminFilesWriteTool extends McpTool
{
    use ResolvesAdminTargets;
    use SnapshotsWorkspace;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_files_write';
    }

    public function description(): string
    {
        return 'Create or overwrite one or many files in any project workspace. Pass "files" as a map of relative path => content to write a coherent set of code in a single call (preferred for building a site), or "path" + "content" for a single file.';
    }

    public function requiredAbility(): ?string
    {
        return 'files:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string'],
                'path' => ['type' => 'string'],
                'content' => ['type' => 'string'],
                'files' => [
                    'type' => 'object',
                    'description' => 'Map of relative path => file content.',
                    'additionalProperties' => ['type' => 'string'],
                ],
            ],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $project = $this->resolveProject($arguments);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        // Punto de retorno antes de tocar los ficheros (con antirrebote:
        // ver SnapshotsWorkspace). Se devuelve como `revision_id` para que
        // quien llame sepa a dónde volver — o que esta vez no hay vuelta.
        $revisionId = $this->snapshotBeforeWrite($project, $context instanceof \App\Models\User ? $context : null, 'Antes de escribir ficheros', ['tool' => $this->name()]);

        $files = is_array($arguments['files'] ?? null) ? $arguments['files'] : [];

        if (($path = trim((string) ($arguments['path'] ?? ''))) !== '') {
            $files[$path] = (string) ($arguments['content'] ?? '');
        }

        if ($files === []) {
            return ['success' => false, 'message' => 'Pass "files" (path => content) or "path" + "content".'];
        }

        $written = [];
        $errors = [];

        foreach ($files as $relative => $content) {
            try {
                $this->workspace->writeFile($project, (string) $relative, (string) $content);
                $written[] = (string) $relative;
            } catch (\Throwable $e) {
                $errors[(string) $relative] = $e->getMessage();
            }
        }

        // One rebuild after the whole batch, and the failure is reported
        // rather than swallowed: the files really are saved, but a build
        // that did not compile means the published site is still serving the
        // previous version — which the caller has to know to act on.
        $previewWarning = $this->workspace->syncPreviewSafely($project);

        return [
            'success' => $written !== [],
            'message' => $written === [] ? 'No file could be written.' : null,
            'project_id' => $project->id,
            'revision_id' => $revisionId,
            'written' => $written,
            'errors' => $errors ?: null,
            'preview_warning' => $previewWarning,
        ];
    }
}
