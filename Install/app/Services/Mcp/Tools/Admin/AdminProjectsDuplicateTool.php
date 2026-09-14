<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;
use RuntimeException;

class AdminProjectsDuplicateTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(protected ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_projects_duplicate';
    }

    public function description(): string
    {
        return 'Copy a project, files and all, into a new one. Use it to try a big change without risking the original. '
            .'The copy belongs to the same owner unless you name another one, and is never published.';
    }

    public function requiredAbility(): ?string
    {
        return 'projects:create';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string', 'description' => 'Project id or subdomain to copy.'],
                'user_id' => ['type' => 'integer', 'description' => 'Give the copy to this user instead of the original owner.'],
                'user_email' => ['type' => 'string'],
                'name' => ['type' => 'string', 'description' => 'Name for the copy. Defaults to the original plus a suffix.'],
            ],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $original = $this->resolveProject($arguments);

        if ($original->trashed()) {
            throw new RuntimeException('This project is in the trash. Restore it before duplicating.');
        }

        // Sin user_id ni user_email el dueño es el del original, no quien
        // llama: duplicar el sitio de un cliente no debería cambiarlo de manos.
        $destinatario = ($arguments['user_id'] ?? null) || ($arguments['user_email'] ?? null)
            ? $this->resolveOwner($arguments, $context)
            : $original->user;

        if (! $destinatario) {
            throw new RuntimeException('The original project has no owner; pass user_id or user_email.');
        }

        $copia = $original->duplicate($destinatario);

        if ($nombre = trim((string) ($arguments['name'] ?? ''))) {
            $copia->update(['name' => $nombre]);
        }

        $avisoPreview = $this->workspace->syncPreviewSafely($copia);

        return [
            'success' => true,
            'message' => "Duplicated as \"{$copia->name}\".",
            'project' => [
                'id' => $copia->id,
                'name' => $copia->name,
                'owner_id' => $destinatario->id,
                'source_project_id' => $original->id,
            ],
            'preview_warning' => $avisoPreview,
        ];
    }
}
