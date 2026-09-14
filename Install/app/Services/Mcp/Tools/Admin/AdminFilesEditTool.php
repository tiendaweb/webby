<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\EditsWorkspaceFiles;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

/**
 * Change one detail of a file without rewriting it.
 *
 * admin_files_write replaces a whole file, which means the model has to
 * reproduce everything it is not changing — and anything it did not know
 * about is lost. This applies targeted find/replace edits instead, and
 * refuses the whole set if any "find" does not match, so a silent no-op
 * cannot be mistaken for a successful change.
 */
class AdminFilesEditTool extends McpTool
{
    use SnapshotsWorkspace;
    use EditsWorkspaceFiles, ResolvesAdminTargets;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_files_edit';
    }

    public function description(): string
    {
        return 'Change parts of an existing file in place, without rewriting it. Prefer this over admin_files_write for small changes. '
            .'Edits are literal find/replace (or regex) applied in order and are all-or-nothing: if any "find" matches nothing, nothing is written. '
            .'Use admin_files_search first to locate the text.';
    }

    public function requiredAbility(): ?string
    {
        return 'files:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => ['project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.']] + $this->editsSchema(),
            'required' => ['project_id', 'path', 'edits'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $project = $this->resolveProject($arguments);

            $result = $this->workspace->applyEdits(
                $project,
                (string) ($arguments['path'] ?? ''),
                is_array($arguments['edits'] ?? null) ? $arguments['edits'] : [],
                (bool) ($arguments['dry_run'] ?? false),
            );
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        // Punto de retorno antes de tocar los ficheros (con antirrebote:
        // ver SnapshotsWorkspace). Se devuelve como `revision_id` para que
        // quien llame sepa a dónde volver — o que esta vez no hay vuelta.
        $revisionId = $this->snapshotBeforeWrite($project, $context instanceof \App\Models\User ? $context : null, 'Antes de editar un fichero', ['tool' => $this->name()]);

        return ['project_id' => $project->id, 'revision_id' => $revisionId] + $result;
    }
}
