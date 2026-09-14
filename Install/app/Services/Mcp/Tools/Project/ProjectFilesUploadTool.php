<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

class ProjectFilesUploadTool extends McpTool
{
    use SnapshotsWorkspace;

    public function __construct(protected ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'project_files_upload';
    }

    public function description(): string
    {
        return 'Put a binary file (image, font, icon, PDF) into this site by sending its bytes as base64. '
            .'Use this for a file you generated or the user handed you; use project_files_download when it already lives at a public URL. '
            .'Up to 25 MB.';
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
                'path' => ['type' => 'string', 'description' => 'Where to save it, e.g. "assets/logo.png".'],
                'content_base64' => ['type' => 'string', 'description' => 'File bytes, base64. A "data:...;base64," prefix is accepted and stripped.'],
                'overwrite' => ['type' => 'boolean', 'default' => false],
            ],
            'required' => ['path', 'content_base64'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];

        $revision = $this->snapshotBeforeWrite(
            $project,
            $project->user,
            'Antes de subir '.$arguments['path'],
            ['tool' => $this->name(), 'path' => $arguments['path']],
        );

        return $this->workspace->writeBinaryFile(
            $project,
            (string) $arguments['path'],
            (string) $arguments['content_base64'],
            (bool) ($arguments['overwrite'] ?? false),
        ) + ['revision_id' => $revision];
    }
}
