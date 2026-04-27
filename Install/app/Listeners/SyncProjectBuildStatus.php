<?php

namespace App\Listeners;

use App\Events\Builder\BuilderCompleteEvent;
use App\Events\Builder\BuilderErrorEvent;
use App\Events\Builder\BuilderStatusEvent;
use App\Models\Project;
use Illuminate\Support\Facades\Log;

class SyncProjectBuildStatus
{
    /**
     * Terminal statuses that should be persisted to database.
     */
    private const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled'];

    /**
     * Handle the builder status event.
     */
    public function handle(BuilderStatusEvent $event): void
    {
        $status = $event->status;

        // Only sync terminal statuses - ignore intermediate states like "running", "connecting"
        if (! in_array($status, self::TERMINAL_STATUSES, true)) {
            return;
        }

        // Find project by session ID
        $project = Project::where('build_session_id', $event->sessionId)->first();

        if (! $project) {
            Log::warning('Project not found for status sync', [
                'session_id' => $event->sessionId,
                'status' => $status,
            ]);

            return;
        }

        // Update project build status
        $project->update([
            'build_status' => $status,
            'build_completed_at' => now(),
        ]);

        Log::info('Project build status synced via webhook', [
            'project_id' => $project->id,
            'session_id' => $event->sessionId,
            'status' => $status,
        ]);
    }

    /**
     * Handle the builder complete event - sync status to completed.
     */
    public function handleComplete(BuilderCompleteEvent $event): void
    {
        $project = Project::where('build_session_id', $event->sessionId)->first();

        if (! $project) {
            Log::warning('Project not found for complete sync', [
                'session_id' => $event->sessionId,
            ]);

            return;
        }

        $project->update([
            'build_status' => 'completed',
            'build_completed_at' => now(),
        ]);

        Log::info('Project build status synced via complete event', [
            'project_id' => $project->id,
            'session_id' => $event->sessionId,
        ]);
    }

    /**
     * Handle the builder error event - sync status to failed.
     */
    public function handleError(BuilderErrorEvent $event): void
    {
        $project = Project::where('build_session_id', $event->sessionId)->first();

        if (! $project) {
            Log::warning('Project not found for error sync', [
                'session_id' => $event->sessionId,
            ]);

            return;
        }

        $project->update([
            'build_status' => 'failed',
            'build_completed_at' => now(),
        ]);

        Log::info('Project build status synced via error event', [
            'project_id' => $project->id,
            'session_id' => $event->sessionId,
            'error' => $event->error,
        ]);
    }
}
