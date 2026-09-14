<?php

namespace App\Services\Mcp\Tools\Project;

use App\Models\Project;
use App\Services\Mcp\McpTool;

/**
 * The customer-facing half: the notes left in *this* site's chat. The
 * project comes from the validated connector token, never from an argument.
 */
class ProjectNotesListTool extends McpTool
{
    public function name(): string
    {
        return 'project_notes_list';
    }

    public function description(): string
    {
        return 'Read the notes the owner left in this site\'s chat for the connectors — work items that were deliberately not sent to the AI builder. '
            .'Filter by status ("pending" is the queue). Answer one with project_notes_respond.';
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
                'status' => ['type' => 'string', 'enum' => Project::NOTE_STATUSES, 'description' => 'Omit for every note.'],
                'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 200, 'default' => 50],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        /** @var Project $project */
        $project = $context['project'];

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
