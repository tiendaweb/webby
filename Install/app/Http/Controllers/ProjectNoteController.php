<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Notes left in a project's chat for the MCP connectors.
 *
 * A note looks like a chat message and lives in the same
 * conversation_history, but it is never sent to the AI builder — it is a
 * work item addressed to whatever assistant is connected over MCP
 * (Claude/ChatGPT/Grok), which reads it, does the work, and writes back a
 * result that appears in the thread as the reply.
 *
 * Deliberately a separate controller from ChatController::send(): that path
 * spends build credits and starts a builder session, and none of that
 * behaviour changes. Nothing here touches it.
 *
 * @see \App\Models\Project::appendNote()
 * @see \App\Services\Mcp\Tools\Admin\AdminNotesListTool
 */
class ProjectNoteController extends Controller
{
    public function index(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $status = $request->query('status');

        return response()->json([
            'notes' => $project->listNotes(
                in_array($status, Project::NOTE_STATUSES, true) ? $status : null,
                (int) $request->query('limit', 50),
            ),
            'statuses' => Project::NOTE_STATUSES,
        ]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $validated = $request->validate([
            'content' => 'required|string|max:5000',
            'files' => 'nullable|array|max:20',
            'files.*.id' => 'required|integer',
            'files.*.filename' => 'required|string|max:255',
            'files.*.mime_type' => 'nullable|string|max:120',
        ]);

        $note = $project->appendNote(
            $validated['content'],
            $request->user(),
            $validated['files'] ?? null,
        );

        return response()->json([
            'success' => true,
            'note' => $note,
            'message' => 'Saved for the connectors. It was not sent to the AI builder.',
        ], 201);
    }

    /**
     * Change a note's status from the UI — cancelling one the owner no
     * longer wants a connector to pick up.
     */
    public function update(Request $request, Project $project, string $note): JsonResponse
    {
        Gate::authorize('update', $project);

        $validated = $request->validate([
            'status' => 'required|string|in:'.implode(',', Project::NOTE_STATUSES),
        ]);

        $updated = $project->updateNoteStatus($note, $validated['status']);

        if (! $updated) {
            return response()->json(['error' => 'Note not found.'], 404);
        }

        return response()->json(['success' => true, 'note' => $updated]);
    }
}
