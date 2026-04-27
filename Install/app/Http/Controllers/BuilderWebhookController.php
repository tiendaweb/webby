<?php

namespace App\Http\Controllers;

use App\Events\Builder\BuilderActionEvent;
use App\Events\Builder\BuilderCompleteEvent;
use App\Events\Builder\BuilderErrorEvent;
use App\Events\Builder\BuilderMessageEvent;
use App\Events\Builder\BuilderStatusEvent;
use App\Events\Builder\BuilderThinkingEvent;
use App\Events\Builder\BuilderToolCallEvent;
use App\Events\Builder\BuilderToolResultEvent;
use App\Events\ProjectStatusUpdatedEvent;
use App\Models\Project;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BuilderWebhookController extends Controller
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    public function handle(Request $request): JsonResponse
    {
        // Validate required fields
        $validated = $request->validate([
            'session_id' => 'required|string',
            'event_type' => 'required|string',
            'data' => 'required|array',
            'timestamp' => 'nullable|string',
        ]);

        $sessionId = $validated['session_id'];
        $eventType = $validated['event_type'];
        $data = $validated['data'];

        // Dispatch appropriate event
        $dispatched = match ($eventType) {
            'status' => $this->dispatchStatus($sessionId, $data),
            'thinking' => $this->dispatchThinking($sessionId, $data),
            'action' => $this->dispatchAction($sessionId, $data),
            'tool_call' => $this->dispatchToolCall($sessionId, $data),
            'tool_result' => $this->dispatchToolResult($sessionId, $data),
            'message' => $this->dispatchMessage($sessionId, $data),
            'error' => $this->dispatchError($sessionId, $data),
            'complete' => $this->dispatchComplete($sessionId, $data),
            'summarization_complete' => $this->handleSummarizationComplete($sessionId, $data),
            'plan', 'iteration_start', 'retry', 'token_usage',
            'tool_timeout', 'tool_retry', 'credit_warning', 'credit_exceeded' => true,
            default => false,
        };

        if ($dispatched === false) {
            return response()->json(['error' => 'Unknown event type: '.$eventType], 400);
        }

        return response()->json(['success' => true]);
    }

    protected function dispatchStatus(string $sessionId, array $data): bool
    {
        BuilderStatusEvent::dispatch(
            $sessionId,
            $data['status'] ?? '',
            $data['message'] ?? ''
        );

        return true;
    }

    protected function dispatchThinking(string $sessionId, array $data): bool
    {
        $content = $data['content'] ?? '';

        // Thinking events are for real-time UI display only.
        // Persistence is handled by dispatchMessage and dispatchComplete.
        BuilderThinkingEvent::dispatch(
            $sessionId,
            $content,
            $data['iteration'] ?? 0
        );

        return true;
    }

    protected function dispatchAction(string $sessionId, array $data): bool
    {
        $action = $data['action'] ?? '';
        $target = $data['target'] ?? '';
        $category = $data['category'] ?? '';

        // Save action to conversation history for context
        if (! empty($action)) {
            $project = Project::where('build_session_id', $sessionId)->first();
            if ($project) {
                $actionText = trim("{$action} {$target}");
                $project->appendToHistory('action', $actionText, $category ?: null);
            }
        }

        BuilderActionEvent::dispatch(
            $sessionId,
            $action,
            $target,
            $data['details'] ?? '',
            $category
        );

        return true;
    }

    protected function dispatchToolCall(string $sessionId, array $data): bool
    {
        BuilderToolCallEvent::dispatch(
            $sessionId,
            $data['id'] ?? '',
            $data['tool'] ?? '',
            $data['params'] ?? []
        );

        return true;
    }

    protected function dispatchToolResult(string $sessionId, array $data): bool
    {
        BuilderToolResultEvent::dispatch(
            $sessionId,
            $data['id'] ?? '',
            $data['tool'] ?? '',
            $data['success'] ?? false,
            $data['output'] ?? '',
            (int) ($data['duration_ms'] ?? 0),
            (int) ($data['iteration'] ?? 0),
        );

        return true;
    }

    protected function dispatchMessage(string $sessionId, array $data): bool
    {
        $content = $data['content'] ?? '';

        // Persist assistant message to conversation history (with row lock to prevent
        // race with dispatchComplete which bypasses the Go builder's webhook queue)
        if (! empty($content)) {
            DB::transaction(function () use ($sessionId, $content) {
                $project = Project::where('build_session_id', $sessionId)->lockForUpdate()->first();
                if (! $project) {
                    return;
                }

                // Check if this content was already saved by another handler
                $history = $project->conversation_history ?? [];
                $alreadySaved = false;
                foreach (array_reverse($history) as $entry) {
                    if ($entry['role'] === 'user') {
                        break;
                    }
                    if ($entry['role'] === 'assistant' && $entry['content'] === $content) {
                        $alreadySaved = true;
                        break;
                    }
                }

                if (! $alreadySaved) {
                    $thinkingDuration = null;
                    $lastUserTimestamp = $project->getLastUserMessageTimestamp();
                    if ($lastUserTimestamp) {
                        $thinkingDuration = (int) $lastUserTimestamp->diffInSeconds(now());
                    }

                    $project->appendToHistory('assistant', $content, null, $thinkingDuration);
                }
            });
        }

        BuilderMessageEvent::dispatch(
            $sessionId,
            $content
        );

        return true;
    }

    protected function dispatchError(string $sessionId, array $data): bool
    {
        BuilderErrorEvent::dispatch(
            $sessionId,
            $data['error'] ?? ''
        );

        return true;
    }

    protected function dispatchComplete(string $sessionId, array $data): bool
    {
        // Extract event ID from webhook data (sent by Go builder)
        $eventId = $data['event_id'] ?? null;

        // Also check header as fallback
        if (! $eventId) {
            $eventId = request()->header('X-Webhook-ID');
        }

        // Save the final AI message if included in complete event (with row lock to
        // prevent race with dispatchMessage which may be processing concurrently)
        $message = $data['message'] ?? '';
        if (! empty($message)) {
            DB::transaction(function () use ($sessionId, $message) {
                $project = Project::where('build_session_id', $sessionId)->lockForUpdate()->first();
                if (! $project) {
                    return;
                }

                // Check all recent assistant entries since action/status entries
                // may appear between the message save and the complete event
                $history = $project->conversation_history ?? [];
                $alreadySaved = false;
                foreach (array_reverse($history) as $entry) {
                    if ($entry['role'] === 'user') {
                        break;
                    }
                    if ($entry['role'] === 'assistant' && $entry['content'] === $message) {
                        $alreadySaved = true;
                        break;
                    }
                }

                if (! $alreadySaved) {
                    $thinkingDuration = null;
                    $lastUserTimestamp = $project->getLastUserMessageTimestamp();
                    if ($lastUserTimestamp) {
                        $thinkingDuration = (int) $lastUserTimestamp->diffInSeconds(now());
                    }

                    $project->appendToHistory('assistant', $message, null, $thinkingDuration);
                }
            });
        }

        BuilderCompleteEvent::dispatch(
            $sessionId,
            $eventId,
            $data['iterations'] ?? 0,
            $data['tokens_used'] ?? 0,
            $data['files_changed'] ?? false,
            $data['prompt_tokens'] ?? null,
            $data['completion_tokens'] ?? null,
            $data['model'] ?? null,
            $data['build_status'] ?? null,
            $data['build_message'] ?? null,
            $data['build_required'] ?? false,
        );

        // Send user notifications for build status
        $this->notifyBuildStatus($sessionId, $data);

        return true;
    }

    /**
     * Notify user about build completion or failure.
     */
    protected function notifyBuildStatus(string $sessionId, array $data): void
    {
        $buildStatus = $data['build_status'] ?? null;

        // Only notify on actual build status changes
        if (! in_array($buildStatus, ['completed', 'failed'])) {
            return;
        }

        $project = Project::where('build_session_id', $sessionId)->with('user')->first();

        if (! $project || ! $project->user) {
            return;
        }

        // Broadcast project status update for real-time project list updates
        event(new ProjectStatusUpdatedEvent(
            $project->user->id,
            $project->id,
            $buildStatus,
            $data['build_message'] ?? null
        ));

        // Send notification based on build status
        if ($buildStatus === 'completed') {
            $this->notificationService->notifyBuildComplete($project->user, $project);
        } elseif ($buildStatus === 'failed') {
            $this->notificationService->notifyBuildFailed(
                $project->user,
                $project,
                $data['build_message'] ?? 'Build failed'
            );
        }
    }

    /**
     * Handle summarization_complete event.
     * Stores the compacted history for reuse on future requests.
     */
    protected function handleSummarizationComplete(string $sessionId, array $data): bool
    {
        $compactedHistory = $data['compacted_history'] ?? null;

        // Only store if compacted_history is provided
        if (! empty($compactedHistory) && is_array($compactedHistory)) {
            $project = Project::where('build_session_id', $sessionId)->first();
            if ($project) {
                $project->storeCompactedHistory($compactedHistory);

                \Log::info('Stored compacted history from builder', [
                    'project_id' => $project->id,
                    'session_id' => $sessionId,
                    'turns_compacted' => $data['turns_compacted'] ?? 0,
                    'turns_kept' => $data['turns_kept'] ?? 0,
                    'reduction_percent' => $data['reduction_percent'] ?? 0,
                ]);
            }
        }

        return true;
    }
}
