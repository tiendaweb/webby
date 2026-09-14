<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;

/**
 * Soft-delete (trash) or permanently destroy any project. Permanent
 * deletion is irreversible and therefore requires confirm=true on top of
 * the projects:delete ability.
 */
class AdminProjectsDeleteTool extends McpTool
{
    use ResolvesAdminTargets;

    public function name(): string
    {
        return 'admin_projects_delete';
    }

    public function description(): string
    {
        return 'Move any project to the trash, or permanently delete it with force=true and confirm=true. Use restore=true to bring a trashed project back.';
    }

    public function requiredAbility(): ?string
    {
        return 'projects:delete';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string'],
                'force' => ['type' => 'boolean', 'default' => false, 'description' => 'Permanently delete instead of trashing. Irreversible.'],
                'confirm' => ['type' => 'boolean', 'default' => false, 'description' => 'Required together with force=true.'],
                'restore' => ['type' => 'boolean', 'default' => false, 'description' => 'Restore a trashed project instead of deleting.'],
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

        if ($arguments['restore'] ?? false) {
            if (! $project->trashed()) {
                return ['success' => false, 'message' => 'This project is not in the trash.'];
            }

            $project->restore();

            return ['success' => true, 'action' => 'restored', 'project' => $this->projectSummary($project->fresh())];
        }

        $force = (bool) ($arguments['force'] ?? false);

        if ($force) {
            if (! ($arguments['confirm'] ?? false)) {
                return ['success' => false, 'message' => 'Permanent deletion requires confirm=true. Omit force to move the project to the trash instead.'];
            }

            $id = $project->id;
            $project->forceDelete();

            return ['success' => true, 'action' => 'force_deleted', 'project_id' => $id];
        }

        $project->delete();

        return ['success' => true, 'action' => 'trashed', 'project_id' => $project->id];
    }
}
