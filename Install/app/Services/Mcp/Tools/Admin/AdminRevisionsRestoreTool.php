<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\ProjectRevision;
use App\Models\User;
use App\Services\Mcp\McpTool;
use App\Services\ProjectRevisionService;
use App\Services\ProjectWorkspaceService;
use RuntimeException;

class AdminRevisionsRestoreTool extends McpTool
{
    public function __construct(
        protected ProjectRevisionService $revisions,
        protected ProjectWorkspaceService $workspace,
    ) {}

    public function name(): string
    {
        return 'admin_revisions_restore';
    }

    public function description(): string
    {
        return 'Put a project back to a previous restore point. Takes a fresh restore point of the current state first, '
            .'so restoring is itself reversible, and rebuilds the preview afterwards.';
    }

    public function requiredAbility(): ?string
    {
        return 'projects:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'revision_id' => ['type' => 'string', 'description' => 'Revision id from admin_revisions_list (a UUID).'],
                'confirm' => ['type' => 'boolean', 'description' => 'Must be true. Restoring overwrites the current files.'],
            ],
            'required' => ['revision_id', 'confirm'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        if (($arguments['confirm'] ?? false) !== true) {
            throw new RuntimeException('Pass confirm: true — restoring overwrites the files the project has right now.');
        }

        $revision = ProjectRevision::with('project')->find((string) ($arguments['revision_id'] ?? ''));

        if (! $revision || ! $revision->project) {
            throw new RuntimeException('Revision not found: '.($arguments['revision_id'] ?? '(missing)'));
        }

        $project = $revision->project;

        // El estado actual también es un estado al que alguien puede querer
        // volver. Sin esta instantánea, restaurar sería la única operación
        // del sistema sin marcha atrás.
        $vuelta = $this->revisions->create(
            $project,
            $context instanceof User ? $context : null,
            'before_restore',
            "Antes de restaurar #{$revision->id}",
        );

        $resultado = $this->revisions->restore($revision);
        $errorPreview = $this->workspace->syncPreviewSafely($project);

        return [
            'success' => true,
            'message' => "{$project->name} restored to revision #{$revision->id}.",
            'restored' => $resultado,
            'undo_revision_id' => $vuelta->id,
            'preview_error' => $errorPreview,
        ];
    }
}
