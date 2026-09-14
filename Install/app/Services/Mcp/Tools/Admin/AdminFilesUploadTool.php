<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\User;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

class AdminFilesUploadTool extends McpTool
{
    use ResolvesAdminTargets;
    use SnapshotsWorkspace;

    public function __construct(protected ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_files_upload';
    }

    public function description(): string
    {
        return 'Put a binary file (image, font, icon, PDF) into a project workspace by sending its bytes as base64. '
            .'Use this for a file you generated or the user handed you; use admin_files_download when it already lives at a public URL. '
            .'Up to 25 MB, same file types the workspace allows.';
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
                'project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.'],
                'path' => ['type' => 'string', 'description' => 'Where to save it, e.g. "assets/logo.png".'],
                'content_base64' => ['type' => 'string', 'description' => 'File bytes, base64. A "data:...;base64," prefix is accepted and stripped.'],
                'overwrite' => ['type' => 'boolean', 'default' => false],
            ],
            'required' => ['project_id', 'path', 'content_base64'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $this->resolveProject($arguments);

        $revision = $this->snapshotBeforeWrite(
            $project,
            $context instanceof User ? $context : null,
            'Antes de subir '.$arguments['path'],
            ['tool' => $this->name(), 'path' => $arguments['path']],
        );

        $resultado = $this->workspace->writeBinaryFile(
            $project,
            (string) $arguments['path'],
            (string) $arguments['content_base64'],
            (bool) ($arguments['overwrite'] ?? false),
        );

        return $resultado + ['revision_id' => $revision];
    }
}
