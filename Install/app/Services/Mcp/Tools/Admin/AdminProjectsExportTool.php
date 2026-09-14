<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;
use Illuminate\Support\Facades\URL;

class AdminProjectsExportTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(protected ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_projects_export';
    }

    public function description(): string
    {
        return 'Get a download link for the whole project as a zip — the other half of admin_projects_import. '
            .'Use it as a backup before a big change. The link expires and only works for the owner or an admin.';
    }

    public function requiredAbility(): ?string
    {
        return 'files:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.'],
                'expires_minutes' => ['type' => 'integer', 'default' => 30, 'maximum' => 1440],
            ],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $this->resolveProject($arguments);
        $minutos = min(max((int) ($arguments['expires_minutes'] ?? 30), 1), 1440);

        // Se cuentan los ficheros antes de dar el enlace: prometer una
        // descarga de un proyecto vacío es peor que decirlo ahora.
        //
        // listFiles() envuelve la lista en ['files' => ..., 'runtime' => ...],
        // así que el array de fuera nunca está vacío ni vale para contar.
        $entradas = $this->workspace->listFiles($project)['files'] ?? [];
        $ficheros = array_filter($entradas, fn ($e) => ! ($e['is_dir'] ?? false));

        if ($ficheros === []) {
            return ['success' => false, 'message' => 'This project has no files to export yet.'];
        }

        return [
            'success' => true,
            'project' => ['id' => $project->id, 'name' => $project->name],
            'files' => count($ficheros),
            'download_url' => URL::temporarySignedRoute('projects.export', now()->addMinutes($minutos), ['project' => $project->id]),
            'expires_in_minutes' => $minutos,
            'note' => 'The zip is built when the link is opened, so nothing is stored on the server in the meantime.',
        ];
    }
}
