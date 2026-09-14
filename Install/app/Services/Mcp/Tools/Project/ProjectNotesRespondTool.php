<?php

namespace App\Services\Mcp\Tools\Project;

use App\Models\Project;
use App\Services\Mcp\McpTool;

/**
 * Answer a note on this site. The reply lands in the chat where the AI
 * builder's answer would normally be, so it should describe what actually
 * happened, not what is planned.
 */
class ProjectNotesRespondTool extends McpTool
{
    public function name(): string
    {
        return 'project_notes_respond';
    }

    public function description(): string
    {
        return 'Reply to a note in this site\'s chat. The reply appears to the owner where the AI answer would normally be, '
            .'so describe what you actually did. Set status to done/failed. '
            .'Omit "content" and pass status=in_progress to claim a note without answering it yet.';
    }

    public function requiredAbility(): ?string
    {
        return 'notes:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'note_id' => ['type' => 'string', 'description' => 'From project_notes_list.'],
                'content' => ['type' => 'string', 'description' => 'What you did, in the owner\'s language. Markdown is rendered.'],
                'status' => ['type' => 'string', 'enum' => Project::NOTE_STATUSES, 'default' => 'done'],
                'data' => ['type' => 'object', 'description' => 'Optional structured detail: files changed, urls, ids.'],
            ],
            'required' => ['note_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        /** @var Project $project */
        $project = $context['project'];
        $noteId = trim((string) ($arguments['note_id'] ?? ''));

        if ($noteId === '') {
            return ['success' => false, 'message' => '"note_id" is required.'];
        }

        $status = (string) ($arguments['status'] ?? 'done');
        $content = trim((string) ($arguments['content'] ?? ''));

        if ($content === '') {
            $updated = $project->updateNoteStatus($noteId, $status === 'done' ? 'in_progress' : $status);

            if (! $updated) {
                return ['success' => false, 'message' => "No note with id {$noteId} in this project."];
            }

            return ['success' => true, 'note' => $updated, 'answered' => false];
        }

        $outcome = $project->appendNoteResult(
            $noteId,
            $content,
            $status,
            $context['token']->name ?? 'Connector',
            is_array($arguments['data'] ?? null) ? $arguments['data'] : null,
        );

        if (! $outcome) {
            return ['success' => false, 'message' => "No note with id {$noteId} in this project."];
        }

        return [
            'success' => true,
            'answered' => true,
            'note' => $outcome['note'],
            'result' => $outcome['result'],
            'message' => 'The owner now sees this as the reply in the project chat.',
        ];
    }
}
