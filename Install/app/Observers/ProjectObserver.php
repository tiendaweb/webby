<?php

namespace App\Observers;

use App\Models\Project;
use Illuminate\Support\Facades\Log;

class ProjectObserver
{
    /**
     * Handle the Project "created" event.
     *
     * Auto-generate API token for storage access on project creation.
     */
    public function created(Project $project): void
    {
        // Auto-generate API token for storage access if not already set
        if (! $project->api_token) {
            $token = bin2hex(random_bytes(32));
            $project->api_token = $token;
            $project->saveQuietly(); // Use saveQuietly to avoid triggering observers again

            Log::debug('ProjectObserver: Generated API token for project', [
                'project_id' => $project->id,
                'has_token' => ! empty($project->api_token),
            ]);
        }
    }
}
