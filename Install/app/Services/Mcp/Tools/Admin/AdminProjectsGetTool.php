<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\ProjectRevision;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

class AdminProjectsGetTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(protected ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_projects_get';
    }

    public function description(): string
    {
        return 'Everything about one project in a single call: owner, plan, runtime, publishing state, custom domain, '
            .'storage, file count and latest restore point. Use this instead of filtering admin_projects_list.';
    }

    public function requiredAbility(): ?string
    {
        return 'projects:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => ['project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.']],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $this->resolveProject($arguments);
        $owner = $project->user;

        // El recuento de ficheros puede fallar si el workspace todavía no
        // existe; un proyecto recién creado es un caso normal, no un error.
        // listFiles() devuelve ['files' => [...], 'runtime' => ...], no la
        // lista: contar el array de fuera daba 2 en un proyecto de veinte
        // ficheros, y nadie lo habría notado leyendo el número.
        try {
            $entradas = $this->workspace->listFiles($project)['files'] ?? [];
            $ficheros = count(array_filter($entradas, fn ($e) => ! ($e['is_dir'] ?? false)));
        } catch (\Throwable) {
            $ficheros = 0;
        }

        $ultima = ProjectRevision::where('project_id', $project->id)->latest()->first();

        return [
            'success' => true,
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'type' => $project->type,
                'runtime' => $this->workspace->detectRuntime($project),
                'owner' => $owner ? [
                    'id' => $owner->id,
                    'name' => $owner->name,
                    'email' => $owner->email,
                    'plan' => $owner->getCurrentPlan()?->name,
                ] : null,
                'publishing' => [
                    'subdomain' => $project->subdomain,
                    'url' => $this->publicUrl($project),
                    'visibility' => $project->published_visibility,
                    'published_at' => $project->published_at?->toIso8601String(),
                    'is_public' => (bool) $project->is_public,
                ],
                'custom_domain' => [
                    'domain' => $project->custom_domain,
                    'verified' => (bool) $project->custom_domain_verified,
                    'ssl_status' => $project->custom_domain_ssl_status,
                    'verified_at' => $project->custom_domain_verified_at?->toIso8601String(),
                ],
                'build' => [
                    'status' => $project->build_status,
                    'started_at' => $project->build_started_at?->toIso8601String(),
                    'completed_at' => $project->build_completed_at?->toIso8601String(),
                ],
                'files' => $ficheros,
                'storage_used_bytes' => (int) $project->storage_used_bytes,
                'latest_revision' => $ultima ? [
                    'id' => $ultima->id,
                    'label' => $ultima->label,
                    'trigger' => $ultima->trigger,
                    'created_at' => $ultima->created_at?->toIso8601String(),
                ] : null,
                'is_starred' => (bool) $project->is_starred,
                'trashed' => $project->trashed(),
                'created_at' => $project->created_at?->toIso8601String(),
                'updated_at' => $project->updated_at?->toIso8601String(),
            ],
        ];
    }
}
