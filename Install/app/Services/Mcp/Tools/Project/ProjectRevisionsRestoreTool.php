<?php

namespace App\Services\Mcp\Tools\Project;

use App\Models\ProjectRevision;
use App\Services\Mcp\McpTool;
use App\Services\ProjectRevisionService;
use App\Services\ProjectWorkspaceService;
use RuntimeException;

class ProjectRevisionsRestoreTool extends McpTool
{
    public function __construct(
        protected ProjectRevisionService $revisions,
        protected ProjectWorkspaceService $workspace,
    ) {}

    public function name(): string
    {
        return 'project_revisions_restore';
    }

    public function description(): string
    {
        return 'Put this site back to a previous restore point. Takes a fresh restore point of the current state first, '
            .'so this is itself reversible, and rebuilds the preview afterwards.';
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
                'revision_id' => ['type' => 'string', 'description' => 'Revision id from project_revisions_list (a UUID).'],
                'confirm' => ['type' => 'boolean', 'description' => 'Must be true. Restoring overwrites the current files.'],
            ],
            'required' => ['revision_id', 'confirm'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        if (($arguments['confirm'] ?? false) !== true) {
            throw new RuntimeException('Pass confirm: true — restoring overwrites the files the site has right now.');
        }

        $project = $context['project'];

        // Se busca acotado al proyecto del token: sin este `where`, un id
        // ajeno restauraría el sitio de otro cliente.
        $revision = ProjectRevision::where('project_id', $project->id)
            ->find((string) ($arguments['revision_id'] ?? ''));

        if (! $revision) {
            throw new RuntimeException('Revision not found for this project: '.($arguments['revision_id'] ?? '(missing)'));
        }

        $vuelta = $this->revisions->create($project, $project->user, 'before_restore', "Antes de restaurar #{$revision->id}");
        $resultado = $this->revisions->restore($revision);
        $errorPreview = $this->workspace->syncPreviewSafely($project);

        return [
            'success' => true,
            'message' => "Site restored to revision #{$revision->id}.",
            'restored' => $resultado,
            'undo_revision_id' => $vuelta->id,
            'preview_error' => $errorPreview,
        ];
    }
}
