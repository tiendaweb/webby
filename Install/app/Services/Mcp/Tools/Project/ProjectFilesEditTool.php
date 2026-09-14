<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Mcp\Concerns\EditsWorkspaceFiles;
use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

/**
 * The customer-facing half of the surgical edit. The project comes from the
 * validated connector token, never from an argument.
 */
class ProjectFilesEditTool extends McpTool
{
    use EditsWorkspaceFiles;
    use SnapshotsWorkspace;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'project_files_edit';
    }

    public function description(): string
    {
        return 'Change parts of an existing file in place, without rewriting it. Prefer this over project_file_write for small changes. '
            .'Edits are literal find/replace (or regex) applied in order and are all-or-nothing: if any "find" matches nothing, nothing is written.';
    }

    public function requiredAbility(): ?string
    {
        return 'files:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => $this->editsSchema(),
            'required' => ['path', 'edits'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];
        $ensayo = (bool) ($arguments['dry_run'] ?? false);

        // Punto de retorno antes de tocar los ficheros (con antirrebote:
        // ver SnapshotsWorkspace). Se devuelve como `revision_id` para que
        // quien llame sepa a dónde volver — o que esta vez no hay vuelta.
        // Un ensayo no escribe nada, así que no hay estado que guardar.
        $revisionId = $ensayo
            ? null
            : $this->snapshotBeforeWrite($project, $project->user, 'Antes de editar un fichero', ['tool' => $this->name()]);

        try {
            return ['revision_id' => $revisionId] + $this->workspace->applyEdits(
                $project,
                (string) ($arguments['path'] ?? ''),
                is_array($arguments['edits'] ?? null) ? $arguments['edits'] : [],
                $ensayo,
            );
        } catch (\Throwable $e) {
            return ['success' => false, 'revision_id' => $revisionId, 'message' => $e->getMessage()];
        }
    }
}
