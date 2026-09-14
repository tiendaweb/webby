<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

class ProjectPreviewBuildTool extends McpTool
{
    public function __construct(protected ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'project_preview_build';
    }

    public function description(): string
    {
        return 'Rebuild this site\'s preview from the current files. Writing tools already rebuild after each change; '
            .'call this after a batch of edits, or when the published site looks out of date.';
    }

    public function requiredAbility(): ?string
    {
        return 'files:write';
    }

    public function inputSchema(): array
    {
        return ['type' => 'object', 'properties' => new \stdClass];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];
        $runtime = $this->workspace->detectRuntime($project);
        $aviso = $this->workspace->syncPreviewSafely($project);

        if ($aviso !== null) {
            return [
                'success' => false,
                'runtime' => $runtime,
                'message' => $aviso,
                // La construcción es en dos pasos con intercambio al final: si
                // falla, lo que había sigue en pie. Decirlo evita que el
                // asistente anuncie una caída que no ocurrió.
                'note' => 'The previously working preview is still being served, so the live site is not broken.',
            ];
        }

        return ['success' => true, 'runtime' => $runtime, 'message' => 'Preview rebuilt.'];
    }
}
