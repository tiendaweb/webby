<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

/**
 * Rebuild the preview and say plainly whether it worked.
 *
 * The write tools report a build failure as a warning alongside a
 * successful save, which is the right shape there — but after a series of
 * edits you want a single unambiguous answer to "is the published site
 * currently serving my changes, or the last version that compiled?".
 */
class AdminProjectsPreviewBuildTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_projects_preview_build';
    }

    public function description(): string
    {
        return 'Rebuild a project\'s preview and report whether it compiled. '
            .'For a frontend project (Vite/React) this runs the real build and returns the compiler error when it fails. '
            .'A failed build leaves the previously working version live.';
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
                'project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.'],
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

        $runtime = $this->workspace->detectRuntime($project);
        $warning = $this->workspace->syncPreviewSafely($project);

        if ($warning !== null) {
            return [
                'success' => false,
                'project_id' => $project->id,
                'runtime' => $runtime,
                'message' => $warning,
                'note' => 'The previously working preview is still being served, so the published site is not broken.',
            ];
        }

        return [
            'success' => true,
            'project_id' => $project->id,
            'runtime' => $runtime,
            'url' => $this->publicUrl($project),
            'message' => 'The preview rebuilt successfully.',
        ];
    }
}
