<?php

namespace App\Http\Controllers;

use App\Models\Builder;
use App\Models\Project;
use App\Models\Template;
use App\Services\BuilderService;
use App\Services\TemplateClassifierService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class BuilderProxyController extends Controller
{
    public function __construct(
        protected BuilderService $builderService,
        protected TemplateClassifierService $templateClassifier
    ) {}

    /**
     * Get available builders for the current user.
     */
    public function getAvailableBuilders(Request $request): JsonResponse
    {
        $builders = Builder::active()->get();

        return response()->json([
            'builders' => $builders->map(fn ($b) => [
                'id' => $b->id,
                'name' => $b->name,
            ]),
        ]);
    }

    /**
     * Start a new build session.
     */
    public function startBuild(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        // Block demo admin from starting builds
        if (config('app.demo') && Auth::id() === 1) {
            return response()->json([
                'error' => 'The demo admin account cannot start builds. Register your own account to test the AI website builder.',
            ], 403);
        }

        $validated = $request->validate([
            'prompt' => 'required|string|max:10000',
            'builder_id' => 'nullable|exists:builders,id',
            'template_url' => 'nullable|url',
            'template_id' => 'nullable|string',
            'history' => 'array',
            'file_ids' => 'nullable|array',
            'file_ids.*' => 'integer',
        ]);

        $user = $request->user();

        // Block concurrent builds for the same user
        $activeBuild = Project::where('user_id', $user->id)
            ->where('build_status', 'building')
            ->exists();

        if ($activeBuild) {
            return response()->json([
                'error' => 'You have an active session. Wait for it to complete, or stop it.',
            ], 409);
        }

        // Check if user can still perform builds
        $buildCreditService = app(\App\Services\BuildCreditService::class);
        $canBuild = $buildCreditService->canPerformBuild($user);

        if (! $canBuild['allowed']) {
            return response()->json([
                'error' => $canBuild['reason'],
            ], 403);
        }

        // Resolve attached files if file_ids provided
        $attachedFiles = [];
        $fileRefs = null;
        if (! empty($validated['file_ids'])) {
            $plan = $user->getCurrentPlan();
            if (! $plan || ! $plan->fileStorageEnabled()) {
                return response()->json([
                    'error' => 'File storage is not enabled for your plan.',
                ], 403);
            }
            $files = $project->files()->whereIn('id', $validated['file_ids'])->get();
            $attachedFiles = $files->map(fn ($f) => [
                'filename' => $f->original_filename,
                'api_url' => $f->getApiUrl(),
                'mime_type' => $f->mime_type,
                'size' => $f->size,
                'human_size' => $f->getHumanReadableSize(),
            ])->toArray();
            $fileRefs = $files->map(fn ($f) => [
                'id' => $f->id,
                'filename' => $f->original_filename,
                'mime_type' => $f->mime_type,
            ])->toArray();
        }

        // Get AI config from user's plan
        try {
            $aiConfig = $this->builderService->getAiConfigForUser($user);
            // Pass remaining credits to builder for mid-session enforcement
            // 0 = unlimited (user has own API key or unlimited plan)
            $aiConfig['agent']['remaining_build_credits'] = $user->getRemainingBuildCredits();
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 400);
        }

        // Select builder based on plan or auto-select
        $builder = null;

        // First try to get builder from user's plan
        if ($user->plan) {
            $builder = $user->plan->getBuilderWithFallbacks();
        }

        // If no builder from plan, allow manual selection or auto-select
        if (! $builder && ! empty($validated['builder_id'])) {
            $builder = Builder::findOrFail($validated['builder_id']);

            // Check builder is active
            if ($builder->status !== 'active') {
                return response()->json([
                    'error' => 'Selected builder is not active',
                ], 400);
            }
        }

        if (! $builder) {
            return response()->json([
                'error' => 'No builders are currently available. Please try again later.',
            ], 503);
        }

        // Validate and select template
        $templateId = $validated['template_id'] ?? null;

        // Validate explicit template_id against user's plan
        if ($templateId) {
            $template = Template::find($templateId);
            if ($template && ! $template->isAvailableForPlan($user->getCurrentPlan())) {
                return response()->json([
                    'error' => 'The selected template is not available for your plan.',
                ], 403);
            }
        }

        // Auto-select template based on user's goal if none specified
        if (! $templateId) {
            $templateId = $this->autoSelectTemplate($user, $validated['prompt']);
        }

        try {
            // Detect repeated prompts before appending to history
            $promptToSend = $validated['prompt'];
            $repeated = $project->detectRepeatedPrompts($validated['prompt']);
            if ($repeated) {
                $promptToSend .= "\n\nNOTE: The user has asked about this issue {$repeated['count']} times before. Previous attempts may not have fully resolved it. Try a fundamentally different approach.";
            }

            // Append user message to conversation history (raw prompt + file refs)
            $project->appendToHistory('user', $validated['prompt'], null, null, $fileRefs);

            // Enrich prompt with attached file context for builder
            if (! empty($attachedFiles)) {
                $fileLines = array_map(
                    fn ($f) => sprintf('- %s (%s, %s): %s', $f['filename'], $f['mime_type'], $f['human_size'], $f['api_url']),
                    $attachedFiles
                );
                $promptToSend .= "\n\n[Attached Files]\n".implode("\n", $fileLines)
                    ."\nUse these URLs directly in img src, href, or background-image attributes in the generated code.";
            }

            // Get optimized history (uses compacted if available)
            $historyData = $project->getHistoryForBuilderOptimized();

            $result = $this->builderService->startSession(
                $builder,
                $project,
                $promptToSend,
                [], // Legacy parameter, use historyData instead
                $validated['template_url'] ?? null,
                $templateId, // Use auto-selected or provided template
                $aiConfig,
                $historyData // Optimized history with is_compacted flag
            );

            // Update project with build info
            $project->update([
                'builder_id' => $builder->id,
                'build_session_id' => $result['session_id'],
                'build_status' => 'building',
                'build_started_at' => now(),
                'build_completed_at' => null,
            ]);

            return response()->json([
                'session_id' => $result['session_id'],
                'builder_id' => $builder->id,
                'builder_name' => $builder->name,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to start build: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get build status.
     */
    public function getStatus(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        // Quick mode: return only DB status (skips HTTP call to builder service)
        // Used by frontend polling for faster, cheaper status checks
        if ($request->boolean('quick')) {
            return response()->json([
                'status' => $project->build_status,
            ]);
        }

        if (! $project->builder || ! $project->build_session_id) {
            return response()->json([
                'status' => $project->build_status,
                'has_session' => false,
            ]);
        }

        try {
            $status = $this->builderService->getSessionStatus(
                $project->builder,
                $project->build_session_id
            );

            return response()->json([
                'status' => $project->build_status,
                'has_session' => true,
                'session_status' => $status,
                'build_session_id' => $project->build_session_id,
                'build_started_at' => $project->build_started_at?->toIso8601String(),
                'can_reconnect' => $project->build_status === 'building',
                'preview_url' => Storage::disk('local')->exists("previews/{$project->id}")
                    ? "/preview/{$project->id}"
                    : null,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => $project->build_status,
                'has_session' => true,
                'build_session_id' => $project->build_session_id,
                'build_started_at' => $project->build_started_at?->toIso8601String(),
                'can_reconnect' => $project->build_status === 'building',
                'preview_url' => Storage::disk('local')->exists("previews/{$project->id}")
                    ? "/preview/{$project->id}"
                    : null,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send a chat message to continue the session.
     */
    public function chat(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        // Block demo admin from continuing AI builds
        if (config('app.demo') && Auth::id() === 1) {
            return response()->json([
                'error' => 'The demo admin account cannot use the AI builder. Register your own account to test the AI website builder.',
            ], 403);
        }

        $validated = $request->validate([
            'message' => 'required|string|max:10000',
            'file_ids' => 'nullable|array',
            'file_ids.*' => 'integer',
        ]);

        if (! $project->builder || ! $project->build_session_id) {
            return response()->json([
                'error' => 'No active build session',
            ], 404);
        }

        // Resolve attached files if file_ids provided
        $attachedFiles = [];
        $fileRefs = null;
        if (! empty($validated['file_ids'])) {
            $user = $request->user();
            $plan = $user->getCurrentPlan();
            if (! $plan || ! $plan->fileStorageEnabled()) {
                return response()->json([
                    'error' => 'File storage is not enabled for your plan.',
                ], 403);
            }
            $files = $project->files()->whereIn('id', $validated['file_ids'])->get();
            $attachedFiles = $files->map(fn ($f) => [
                'filename' => $f->original_filename,
                'api_url' => $f->getApiUrl(),
                'mime_type' => $f->mime_type,
                'size' => $f->size,
                'human_size' => $f->getHumanReadableSize(),
            ])->toArray();
            $fileRefs = $files->map(fn ($f) => [
                'id' => $f->id,
                'filename' => $f->original_filename,
                'mime_type' => $f->mime_type,
            ])->toArray();
        }

        try {
            // Detect repeated prompts before appending to history
            $messageToSend = $validated['message'];
            $repeated = $project->detectRepeatedPrompts($validated['message']);
            if ($repeated) {
                $messageToSend .= "\n\nNOTE: The user has asked about this issue {$repeated['count']} times before. Previous attempts may not have fully resolved it. Try a fundamentally different approach.";
            }

            // Save user message BEFORE sending to builder (raw message + file refs)
            // Note: This clears compacted_history since it's now stale
            $project->appendToHistory('user', $validated['message'], null, null, $fileRefs);

            // Enrich message with attached file context for builder
            if (! empty($attachedFiles)) {
                $fileLines = array_map(
                    fn ($f) => sprintf('- %s (%s, %s): %s', $f['filename'], $f['mime_type'], $f['human_size'], $f['api_url']),
                    $attachedFiles
                );
                $messageToSend .= "\n\n[Attached Files]\n".implode("\n", $fileLines)
                    ."\nUse these URLs directly in img src, href, or background-image attributes in the generated code.";
            }

            // Get optimized history (uses compacted if available, but after appendToHistory
            // it will be cleared and use full conversation_history)
            $historyData = $project->getHistoryForBuilderOptimized();

            $result = $this->builderService->sendMessage(
                $project->builder,
                $project->build_session_id,
                $messageToSend,
                [], // Legacy parameter, use historyData instead
                $historyData // Optimized history with is_compacted flag
            );

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancel a running build session.
     */
    public function cancel(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        if (! $project->builder || ! $project->build_session_id) {
            return response()->json([
                'error' => 'No active build session',
            ], 404);
        }

        try {
            $cancelled = $this->builderService->cancelSession(
                $project->builder,
                $project->build_session_id
            );

            if ($cancelled) {
                $this->builderService->completeSession($project->builder);

                $project->update([
                    'build_status' => 'cancelled',
                    'build_completed_at' => now(),
                ]);
            }

            return response()->json([
                'cancelled' => $cancelled,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mark build as complete.
     */
    public function completeBuild(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        if ($project->builder) {
            $this->builderService->completeSession($project->builder);
        }

        $project->update([
            'build_status' => 'completed',
            'build_completed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
        ]);
    }

    /**
     * Download build output.
     */
    public function downloadOutput(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        if (! $project->builder) {
            return response()->json([
                'error' => 'No build to download',
            ], 404);
        }

        try {
            $path = $this->builderService->fetchBuildOutput(
                $project->builder,
                $project->id,
                $project
            );

            $project->update(['build_path' => $path]);

            return response()->json([
                'success' => true,
                'path' => $path,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get workspace files.
     */
    public function getFiles(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        // Must have a builder to proceed
        if (! $project->builder) {
            return response()->json([
                'error' => 'No builder assigned to this project',
            ], 404);
        }

        try {
            $files = $this->builderService->getWorkspaceFiles(
                $project->builder,
                $project->id
            );

            return response()->json($files);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get workspace files',
            ], 500);
        }
    }

    /**
     * Get a specific file.
     */
    public function getFile(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $validated = $request->validate([
            'path' => 'required|string',
        ]);

        // Must have a builder to proceed
        if (! $project->builder) {
            return response()->json([
                'error' => 'No builder assigned to this project',
            ], 404);
        }

        try {
            $file = $this->builderService->getFile(
                $project->builder,
                $project->id,
                $validated['path']
            );

            return response()->json($file);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to get file',
            ], 500);
        }
    }

    /**
     * Update a file in workspace.
     */
    public function updateFile(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'path' => 'required|string',
            'content' => 'required|string',
        ]);

        // Must have a builder to proceed
        if (! $project->builder) {
            return response()->json([
                'error' => 'No builder assigned to this project',
            ], 404);
        }

        try {
            $success = $this->builderService->updateFile(
                $project->builder,
                $project->id,
                $validated['path'],
                $validated['content']
            );

            return response()->json(['success' => $success]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update file',
            ], 500);
        }
    }

    /**
     * Trigger a build.
     */
    public function triggerBuild(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        // Must have a builder to proceed
        if (! $project->builder) {
            return response()->json([
                'error' => 'No builder assigned to this project',
            ], 404);
        }

        try {
            $result = $this->builderService->triggerBuild(
                $project->builder,
                $project->id,
                $project->id
            );

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Build failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get AI suggestions.
     */
    public function getSuggestions(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        if (! $project->builder || ! $project->build_session_id) {
            return response()->json([
                'suggestions' => [],
            ]);
        }

        try {
            $result = $this->builderService->getSuggestions(
                $project->builder,
                $project->build_session_id
            );

            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json([
                'suggestions' => [],
            ]);
        }
    }

    /**
     * Check if the builder is online/healthy.
     */
    public function checkBuilderHealth(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        // Get the builder for this project
        $builder = $project->builder;

        // If no builder assigned, try to get one from user's plan
        if (! $builder) {
            $user = $request->user();
            if ($user->plan) {
                $builder = $user->plan->getBuilderWithFallbacks();
            }
        }

        if (! $builder) {
            return response()->json([
                'online' => false,
                'message' => 'No builder available',
            ]);
        }

        // Check builder health by pinging the root URL
        $details = $builder->getDetails();

        return response()->json([
            'online' => $details['online'],
            'builder_id' => $builder->id,
            'builder_name' => $builder->name,
            'builder_url' => $builder->full_url,
            'version' => $details['version'],
            'sessions' => $details['sessions'],
        ]);
    }

    /**
     * Auto-select template based on user's goal using AI classification.
     */
    protected function autoSelectTemplate($user, string $prompt): ?string
    {
        $plan = $user->getCurrentPlan();
        $category = $this->templateClassifier->classify($prompt);

        if ($category) {
            // Get template for the matched category, filtered by plan
            $template = $this->templateClassifier->getTemplateByCategory($category, $plan);

            if ($template) {
                Log::info('Auto-selected template', [
                    'category' => $category,
                    'template_id' => $template->id,
                    'template_name' => $template->name,
                    'plan_id' => $plan?->id,
                ]);

                return (string) $template->id;
            }
        }

        // No category matched or template doesn't exist, use default
        $defaultTemplate = Template::where('slug', 'default')->first();

        return $defaultTemplate ? (string) $defaultTemplate->id : null;
    }
}
