<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\User;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectColorScanService;

class AdminColorsReplaceTool extends McpTool
{
    use ResolvesAdminTargets;
    use SnapshotsWorkspace;

    public function __construct(protected ProjectColorScanService $colors) {}

    public function name(): string
    {
        return 'admin_colors_replace';
    }

    public function description(): string
    {
        return 'Change one colour token of a project. Take the sourcePath, type and token straight from admin_colors_scan — '
            .'this edits the declaration, not every literal match, so it will not repaint things that happened to share the value.';
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
                'sourcePath' => ['type' => 'string', 'maxLength' => 500, 'description' => 'From admin_colors_scan.'],
                'type' => ['type' => 'string', 'maxLength' => 40, 'description' => 'From admin_colors_scan.'],
                'token' => ['type' => 'string', 'maxLength' => 500, 'description' => 'From admin_colors_scan.'],
                'newValue' => ['type' => 'string', 'maxLength' => 500, 'description' => 'The colour to put there, e.g. "#16a34a".'],
            ],
            'required' => ['project_id', 'sourcePath', 'type', 'token', 'newValue'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $this->resolveProject($arguments);

        $revision = $this->snapshotBeforeWrite(
            $project,
            $context instanceof User ? $context : null,
            'Antes de cambiar un color',
            ['tool' => $this->name(), 'token' => $arguments['token']],
        );

        $resultado = $this->colors->replace($project, [
            'sourcePath' => (string) $arguments['sourcePath'],
            'type' => (string) $arguments['type'],
            'token' => (string) $arguments['token'],
            'newValue' => (string) $arguments['newValue'],
        ]);

        return ['success' => true, 'revision_id' => $revision] + $resultado;
    }
}
