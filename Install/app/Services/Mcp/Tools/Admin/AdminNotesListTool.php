<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Project;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;

/**
 * The work queue: notes the site owner left in the project chat for a
 * connector to pick up.
 *
 * These are not messages to the AI builder — they never reached it. They
 * are instructions addressed to you, waiting to be done and answered with
 * admin_notes_respond.
 */
class AdminNotesListTool extends McpTool
{
    use ResolvesAdminTargets;

    public function name(): string
    {
        return 'admin_notes_list';
    }

    public function description(): string
    {
        return 'Read the notes the owner left in a project chat for the connectors — work items that were deliberately not sent to the AI builder. '
            .'Filter by status ("pending" is the queue). Answer one with admin_notes_respond.';
    }

    public function requiredAbility(): ?string
    {
        return 'notes:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.'],
                'status' => ['type' => 'string', 'enum' => Project::NOTE_STATUSES, 'description' => 'Omit for every note.'],
                'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 200, 'default' => 50],
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

        $status = $arguments['status'] ?? null;
        $notes = $project->listNotes(
            in_array($status, Project::NOTE_STATUSES, true) ? $status : null,
            (int) ($arguments['limit'] ?? 50),
        );

        return [
            'success' => true,
            'project' => ['id' => $project->id, 'name' => $project->name],
            'notes' => $notes,
            'count' => count($notes),
            'pending_count' => count($project->listNotes('pending', 200)),
        ];
    }
}
