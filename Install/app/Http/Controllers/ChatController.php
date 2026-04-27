<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\SystemSetting;
use App\Services\FirebaseService;
use App\Services\InternalAiService;
use App\Support\SubdomainHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    public function __construct(
        protected InternalAiService $internalAi,
        protected FirebaseService $firebaseService
    ) {}

    /**
     * Display the chat page for a project.
     */
    public function show(Project $project): Response
    {
        $this->authorize('view', $project);

        $project->update(['last_viewed_at' => now()]);

        // Get broadcast settings from database
        $integrationSettings = SystemSetting::getGroup('integrations');
        $driver = $integrationSettings['broadcast_driver'] ?? 'pusher';

        if ($driver === 'reverb' && ! empty($integrationSettings['reverb_key'])) {
            $pusherConfig = [
                'provider' => 'reverb',
                'key' => $integrationSettings['reverb_key'],
                'host' => $integrationSettings['reverb_host'] ?? '',
                'port' => (int) ($integrationSettings['reverb_port'] ?? 8080),
                'scheme' => $integrationSettings['reverb_scheme'] ?? 'https',
            ];
        } else {
            $pusherConfig = [
                'provider' => 'pusher',
                'key' => $integrationSettings['pusher_key'] ?? '',
                'cluster' => $integrationSettings['pusher_cluster'] ?? 'mt1',
            ];
        }

        // Check if preview exists for this project
        $previewExists = Storage::disk('local')->exists("previews/{$project->id}");
        $previewUrl = $previewExists ? "/preview/{$project->id}" : null;
        $hasActiveSession = ! empty($project->build_session_id) && ! empty($project->builder_id);
        // Only reconnect if build is currently running (not idle, completed, failed, or cancelled)
        $canReconnect = $hasActiveSession && $project->build_status === 'building';

        $user = request()->user();
        $plan = $user->getCurrentPlan();
        $baseDomain = SystemSetting::get('domain_base_domain', config('app.base_domain', 'example.com'));

        // Firebase settings
        $firebaseSettings = null;
        if ($plan && $plan->firebaseEnabled()) {
            $firebaseSettings = [
                'enabled' => true,
                'canUseOwnConfig' => $plan->allowsUserFirebaseConfig(),
                'usesSystemFirebase' => $project->uses_system_firebase,
                'customConfig' => $project->uses_system_firebase ? null : $project->firebase_config,
                'systemConfigured' => $this->firebaseService->isSystemConfigured(),
                'collectionPrefix' => $project->getFirebaseCollectionPrefix(),
            ];
        }

        // Storage settings
        $storageSettings = null;
        if ($plan && $plan->fileStorageEnabled()) {
            $storageSettings = [
                'enabled' => true,
                'usedBytes' => $project->storage_used_bytes ?? 0,
                'limitMb' => $plan->getMaxStorageMb(),
                'unlimited' => $plan->hasUnlimitedStorage(),
                'maxFileSizeMb' => $plan->getMaxFileSizeMb(),
                'allowedTypes' => $plan->getAllowedFileTypes(),
            ];
        }

        // Project files for @mention autocomplete in chat
        $projectFiles = ($plan && $plan->fileStorageEnabled())
            ? $project->files()->orderBy('created_at', 'desc')->limit(100)->get()->map(fn ($f) => [
                'id' => $f->id,
                'filename' => $f->original_filename,
                'mime_type' => $f->mime_type,
                'size' => $f->size,
                'human_size' => $f->getHumanReadableSize(),
                'is_image' => $f->isImage(),
                'url' => $f->getUrl(),
            ])->toArray()
            : [];

        return Inertia::render('Chat', [
            'project' => [
                ...$project->only('id', 'name', 'initial_prompt'),
                'has_history' => ! empty($project->conversation_history),
                'conversation_history' => $project->conversation_history ?? [],
                'preview_url' => $previewUrl,
                'has_active_session' => $hasActiveSession,
                'build_session_id' => $project->build_session_id,
                'build_status' => $project->build_status,
                'can_reconnect' => $canReconnect,
                'build_started_at' => $project->build_started_at?->toIso8601String(),
                // Publishing fields
                'subdomain' => $project->subdomain,
                'published_title' => $project->published_title,
                'published_description' => $project->published_description,
                'published_visibility' => $project->published_visibility ?? 'public',
                'published_at' => $project->published_at?->toIso8601String(),
                // Settings fields
                'custom_instructions' => $project->custom_instructions,
                'theme_preset' => $project->theme_preset,
                'share_image' => $project->share_image,
                'api_token' => $project->api_token,
            ],
            'user' => $user->only('id', 'name', 'email', 'avatar', 'role'),
            'pusherConfig' => $pusherConfig,
            'soundSettings' => $user->aiSettings?->getSoundSettings() ?? [
                'enabled' => false,
                'style' => 'minimal',
                'volume' => 50,
            ],
            // Publishing props
            'baseDomain' => $baseDomain,
            'canUseSubdomains' => SystemSetting::get('domain_enable_subdomains', false) && $user->canUseSubdomains(),
            'canCreateMoreSubdomains' => SystemSetting::get('domain_enable_subdomains', false) && $user->canCreateMoreSubdomains(),
            'canUsePrivateVisibility' => $user->canUsePrivateVisibility(),
            'suggestedSubdomain' => $project->subdomain ?? SubdomainHelper::generateFromString($project->name),
            'subdomainUsage' => $user->getSubdomainUsage(),
            'firebase' => $firebaseSettings,
            'storage' => $storageSettings,
            'projectFiles' => $projectFiles,
            'buildCredits' => [
                'remaining' => $user->getRemainingBuildCredits(),
                'monthlyLimit' => $user->getMonthlyBuildCreditsAllocation(),
                'isUnlimited' => $user->hasUnlimitedCredits(),
                'usingOwnKey' => $user->isUsingOwnAiApiKey(),
            ],
        ]);
    }

    /**
     * Process a chat message and return a dummy AI response.
     */
    public function send(Request $request): JsonResponse
    {
        $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        $responses = [
            "I'm a dummy AI assistant. I received your message and I'm here to help!",
            "That's an interesting question! I'm just a placeholder for now, but the real AI will be much smarter.",
            "I understand what you're asking. This is a demo response to show how the chat interface works.",
            "Great question! In the future, I'll be able to provide more helpful answers.",
            "Thanks for your message! I'm a dummy AI, but I'm doing my best to be helpful.",
            "I see what you mean. Once the real AI is integrated, you'll get much better responses.",
            'Interesting! As a placeholder AI, I can only provide sample responses like this one.',
            'Got it! This dummy response demonstrates the chat functionality is working correctly.',
        ];

        return response()->json([
            'message' => $responses[array_rand($responses)],
        ]);
    }

    /**
     * Get AI-generated suggestions for the chat.
     */
    public function suggestions(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $suggestions = $this->internalAi->getChatSuggestions(
            $project->conversation_history ?? [],
            3
        );

        if ($suggestions === null) {
            return response()->json(['suggestions' => null], 200);
        }

        return response()->json(['suggestions' => $suggestions]);
    }
}
