<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\ProjectRevision;
use App\Services\Mcp\McpTool;
use App\Services\ProjectRevisionService;
use RuntimeException;

class AdminRevisionsGetTool extends McpTool
{
    public function __construct(protected ProjectRevisionService $revisions) {}

    public function name(): string
    {
        return 'admin_revisions_get';
    }

    public function description(): string
    {
        return 'Detail of one restore point, including which files it holds. Use it to check what a revision would '
            .'bring back before restoring it.';
    }

    public function requiredAbility(): ?string
    {
        return 'projects:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'revision_id' => ['type' => 'string', 'description' => 'Revision id from admin_revisions_list (a UUID).'],
                'include_files' => ['type' => 'boolean', 'default' => true, 'description' => 'List the file paths in the snapshot.'],
            ],
            'required' => ['revision_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $revision = ProjectRevision::with(['user:id,name', 'project:id,name'])->find((string) ($arguments['revision_id'] ?? ''));

        if (! $revision) {
            throw new RuntimeException('Revision not found: '.($arguments['revision_id'] ?? '(missing)'));
        }

        $payload = $this->revisions->payload($revision);
        $payload['project'] = $revision->project ? ['id' => $revision->project->id, 'name' => $revision->project->name] : null;

        if ($arguments['include_files'] ?? true) {
            $manifest = $revision->manifest ?? [];
            $files = is_array($manifest['files'] ?? null) ? $manifest['files'] : [];
            // Sólo las rutas: el contenido de una instantánea puede pesar
            // decenas de megas y no cabe en una respuesta de herramienta.
            $payload['files'] = array_values(array_map(
                fn ($f) => is_array($f) ? ($f['path'] ?? null) : $f,
                $files,
            ));
            $payload['skipped'] = is_array($manifest['skipped'] ?? null) ? $manifest['skipped'] : [];
        }

        return ['success' => true, 'revision' => $payload];
    }
}
