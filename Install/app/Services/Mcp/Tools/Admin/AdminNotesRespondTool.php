<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Project;
use App\Models\User;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;

/**
 * Answer a note, and in doing so write the reply the owner reads in the
 * chat.
 *
 * This is the point of the whole mechanism: the bubble that would normally
 * hold the AI builder's answer instead holds your account of what you
 * actually did — which files you touched, what you published, what failed.
 * Say what happened, not what you intend to do.
 *
 * Omitting "content" only moves the status, which is how you claim a note
 * ("in_progress") before starting work that will take a while.
 */
class AdminNotesRespondTool extends McpTool
{
    use ResolvesAdminTargets;

    public function name(): string
    {
        return 'admin_notes_respond';
    }

    public function description(): string
    {
        return 'Reply to a note from a project chat. The reply appears to the owner in the chat where the AI answer would normally be, '
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
                'project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.'],
                'note_id' => ['type' => 'string', 'description' => 'From admin_notes_list.'],
                'content' => ['type' => 'string', 'description' => 'What you did, in the owner\'s language. Markdown is rendered.'],
                'status' => ['type' => 'string', 'enum' => Project::NOTE_STATUSES, 'default' => 'done'],
                'data' => ['type' => 'object', 'description' => 'Optional structured detail: files changed, urls, ids.'],
            ],
            'required' => ['project_id', 'note_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $project = $this->resolveProject($arguments);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        $noteId = trim((string) ($arguments['note_id'] ?? ''));

        if ($noteId === '') {
            return ['success' => false, 'message' => '"note_id" is required.'];
        }

        $status = (string) ($arguments['status'] ?? 'done');
        $content = trim((string) ($arguments['content'] ?? ''));

        // No content means "I am taking this one" rather than "here is the answer".
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
            $this->connectorLabel($context),
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

    /**
     * What the chat shows as the author of the reply. The token's name is
     * the closest thing to "which assistant is this" the server has.
     */
    private function connectorLabel(mixed $context): string
    {
        if ($context instanceof User) {
            $token = $context->currentAccessToken();

            if ($token && $token->name) {
                return (string) $token->name;
            }
        }

        return 'Connector';
    }
}
