<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\User;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectRevisionService;

class AdminRevisionsCreateTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(protected ProjectRevisionService $revisions) {}

    public function name(): string
    {
        return 'admin_revisions_create';
    }

    public function description(): string
    {
        return 'Take a restore point of a project right now, before making a big change. '
            .'File-writing tools already take one automatically once every few minutes; use this to mark a specific moment.';
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
                'label' => ['type' => 'string', 'description' => 'What this moment is, e.g. "Before the redesign".'],
            ],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $this->resolveProject($arguments);
        $label = trim((string) ($arguments['label'] ?? '')) ?: 'Punto de retorno manual';

        $revision = $this->revisions->create(
            $project,
            $context instanceof User ? $context : null,
            'connector_manual',
            $label,
        );

        return [
            'success' => true,
            'message' => "Restore point #{$revision->id} taken for {$project->name}.",
            'revision' => $this->revisions->payload($revision),
        ];
    }
}
