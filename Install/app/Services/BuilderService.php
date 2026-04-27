<?php

namespace App\Services;

use App\Models\AiProvider;
use App\Models\Builder;
use App\Models\Project;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class BuilderService
{
    /**
     * Currently active AI provider for this request.
     */
    protected ?AiProvider $aiProvider = null;

    /**
     * Whether the current user is using their own API key.
     */
    protected bool $usingOwnKey = false;

    /**
     * Get AI configuration from the user's plan's AI Provider.
     * This is the primary method to retrieve AI config.
     * Supports user's own API keys if their plan allows it.
     */
    public function getAiConfigForUser(User $user): array
    {
        $this->usingOwnKey = false;

        // Check if user is using their own API key
        if ($user->isUsingOwnAiApiKey()) {
            return $this->getAiConfigFromUserKey($user);
        }

        $plan = $user->getCurrentPlan();

        if ($plan) {
            $this->aiProvider = $plan->getAiProviderWithFallbacks();
        }

        if (! $this->aiProvider) {
            throw new \Exception('No AI provider configured. Please add an AI provider in admin settings.');
        }

        // Record usage
        $this->aiProvider->recordUsage();

        return $this->aiProvider->toAiConfig();
    }

    /**
     * Get AI configuration from user's own API key.
     */
    protected function getAiConfigFromUserKey(User $user): array
    {
        $this->usingOwnKey = true;
        $settings = $user->aiSettings;

        if (! $settings) {
            throw new \Exception('User AI settings not configured.');
        }

        $provider = $settings->preferred_provider;
        $apiKey = $settings->getApiKeyFor($provider);
        $model = $settings->preferred_model;

        if (empty($apiKey)) {
            throw new \Exception("No API key configured for {$provider}.");
        }

        // Get default base URL for the provider type
        $baseUrl = AiProvider::DEFAULT_BASE_URLS[$provider] ?? '';

        // If no preferred model, use the first default for the provider type
        if (empty($model)) {
            $model = AiProvider::DEFAULT_MODELS[$provider][0] ?? 'gpt-5.2';
        }

        return [
            'provider' => $provider,
            'agent' => [
                'api_key' => $apiKey,
                'base_url' => $baseUrl,
                'model' => $model,
                'max_tokens' => 8192,
                'provider_type' => $provider,
            ],
            'summarizer' => [
                'api_key' => $apiKey,
                'base_url' => $baseUrl,
                'model' => $model, // Use same model as agent for consistency
                'max_tokens' => 1500, // Default for user's own key
                'provider_type' => $provider,
            ],
            'suggestions' => [
                'api_key' => $apiKey,
                'base_url' => $baseUrl,
                'model' => $model, // Use same model as agent for consistency
                'provider_type' => $provider,
            ],
        ];
    }

    /**
     * Get AI configuration from the currently set provider.
     * Used for subsequent calls after initial setup.
     */
    public function getAiConfig(): array
    {
        if ($this->aiProvider) {
            return $this->aiProvider->toAiConfig();
        }

        // Fallback to system default provider from settings
        $defaultId = SystemSetting::get('default_ai_provider_id');
        if ($defaultId) {
            $this->aiProvider = AiProvider::find($defaultId);
            if ($this->aiProvider && $this->aiProvider->status !== 'active') {
                $this->aiProvider = null;
            }
        }

        if (! $this->aiProvider) {
            throw new \Exception('No AI provider configured.');
        }

        return $this->aiProvider->toAiConfig();
    }

    /**
     * Get Pusher/Reverb configuration for direct streaming to frontend.
     * Returns null if broadcasting is not configured.
     * Both Pusher and Reverb use the same payload key ("pusher") since
     * the Go builder uses the Pusher SDK for both.
     */
    protected function getPusherConfigForBuilder(): ?array
    {
        $settings = SystemSetting::getGroup('integrations');
        $driver = $settings['broadcast_driver'] ?? 'pusher';

        if ($driver === 'reverb') {
            if (empty($settings['reverb_app_id']) ||
                empty($settings['reverb_key']) ||
                empty($settings['reverb_secret']) ||
                empty($settings['reverb_host'])) {
                return null;
            }

            $host = $settings['reverb_host'];
            $port = $settings['reverb_port'] ?? 8080;
            $scheme = $settings['reverb_scheme'] ?? 'https';

            return [
                'app_id' => $settings['reverb_app_id'],
                'key' => $settings['reverb_key'],
                'secret' => $settings['reverb_secret'],
                'host' => $host.':'.$port,
                'scheme' => $scheme,
            ];
        }

        // Pusher (default)
        if (empty($settings['pusher_app_id']) ||
            empty($settings['pusher_key']) ||
            empty($settings['pusher_secret'])) {
            return null;
        }

        return [
            'app_id' => $settings['pusher_app_id'],
            'key' => $settings['pusher_key'],
            'secret' => $settings['pusher_secret'],
            'cluster' => $settings['pusher_cluster'] ?? 'mt1',
        ];
    }

    /**
     * Start a new agent session on a builder.
     *
     * @param  Builder  $builder  The builder server to use
     * @param  Project  $project  The project being built
     * @param  string  $prompt  The user's prompt/goal
     * @param  array  $history  Previous conversation history (deprecated, use historyData)
     * @param  string|null  $templateUrl  Optional template URL
     * @param  string|null  $templateId  Optional template ID from Laravel
     * @param  array|null  $aiConfig  Optional AI config (if null, uses current provider)
     * @param  array|null  $historyData  Optimized history data from getHistoryForBuilderOptimized()
     */
    public function startSession(
        Builder $builder,
        Project $project,
        string $prompt,
        array $history = [],
        ?string $templateUrl = null,
        ?string $templateId = null,
        ?array $aiConfig = null,
        ?array $historyData = null
    ): array {
        // Use optimized history data if provided, otherwise fall back to legacy history
        $historyToSend = $history;
        $isCompacted = false;
        if ($historyData !== null) {
            $historyToSend = $historyData['history'] ?? [];
            $isCompacted = $historyData['is_compacted'] ?? false;
        }

        $payload = [
            'goal' => $prompt,
            'max_iterations' => $builder->max_iterations ?? 20,
            'history' => $historyToSend,
            'is_compacted' => $isCompacted,
            'config' => $aiConfig ?? $this->getAiConfig(),
            'workspace_id' => $project->id,
            'webhook_url' => route('builder.webhook'),
        ];

        // Build template config
        $templateConfig = [];
        if ($templateUrl) {
            $templateConfig['url'] = $templateUrl;
        }
        if ($templateId) {
            $templateConfig['template_id'] = $templateId;
            // Look up template name for better logging/display
            $template = \App\Models\Template::find($templateId);
            if ($template) {
                $templateConfig['template_name'] = $template->name;
            }
        }
        if (! empty($templateConfig)) {
            $payload['template'] = $templateConfig;
        }

        // Add Laravel URL for dynamic template fetching
        $laravelUrl = config('app.url');
        if ($laravelUrl) {
            $payload['laravel_url'] = $laravelUrl;
        }

        // Add Pusher config for direct streaming if configured
        $pusherConfig = $this->getPusherConfigForBuilder();
        if ($pusherConfig !== null) {
            $payload['pusher'] = $pusherConfig;
        }

        // Build project capabilities payload for agent awareness
        $payload['project_capabilities'] = $this->buildProjectCapabilities($project);

        // Build theme preset payload
        $themePreset = $this->buildThemePreset($project);
        if ($themePreset !== null) {
            $payload['theme_preset'] = $themePreset;
        }

        $timeout = 30;

        $response = Http::timeout($timeout)
            ->withHeaders(['X-Server-Key' => $builder->server_key])
            ->post("{$builder->full_url}/api/run", $payload);

        if (! $response->successful()) {
            throw new \Exception('Failed to start session: '.$response->body());
        }

        $builder->update(['last_triggered_at' => now()]);

        return $response->json();
    }

    /**
     * Get session status from builder.
     */
    public function getSessionStatus(Builder $builder, string $sessionId): array
    {
        $response = Http::timeout(10)
            ->withHeaders(['X-Server-Key' => $builder->server_key])
            ->get("{$builder->full_url}/api/status/{$sessionId}");

        if (! $response->successful()) {
            throw new \Exception('Failed to get session status');
        }

        return $response->json();
    }

    /**
     * Send a chat message to continue the session.
     *
     * @param  array  $history  Previous conversation history (deprecated, use historyData)
     * @param  array|null  $historyData  Optimized history data from getHistoryForBuilderOptimized()
     */
    public function sendMessage(Builder $builder, string $sessionId, string $message, array $history = [], ?array $historyData = null): array
    {
        // Use optimized history data if provided, otherwise fall back to legacy history
        $historyToSend = $history;
        $isCompacted = false;
        if ($historyData !== null) {
            $historyToSend = $historyData['history'] ?? [];
            $isCompacted = $historyData['is_compacted'] ?? false;
        }

        $response = Http::timeout(30)
            ->withHeaders(['X-Server-Key' => $builder->server_key])
            ->post("{$builder->full_url}/api/chat/{$sessionId}", [
                'message' => $message,
                'history' => $historyToSend,
                'is_compacted' => $isCompacted,
                'config' => $this->getAiConfig(),
            ]);

        if (! $response->successful()) {
            throw new \Exception('Failed to send message: '.$response->body());
        }

        return $response->json();
    }

    /**
     * Cancel a running session.
     */
    public function cancelSession(Builder $builder, string $sessionId): bool
    {
        $response = Http::timeout(10)
            ->withHeaders(['X-Server-Key' => $builder->server_key])
            ->post("{$builder->full_url}/api/stop/{$sessionId}");

        return $response->successful();
    }

    /**
     * Mark session as complete and decrement builder counter.
     */
    public function completeSession(Builder $builder): void
    {
        $builder->decrementSessionCount();
    }

    /**
     * Fetch build output from builder and store locally.
     */
    public function fetchBuildOutput(Builder $builder, string $workspaceId, Project $project): string
    {
        $response = Http::timeout(120)
            ->withHeaders(['X-Server-Key' => $builder->server_key])
            ->get("{$builder->full_url}/api/build-output-workspace/{$workspaceId}");

        if (! $response->successful()) {
            throw new \Exception('Failed to fetch build output: '.$response->body());
        }

        // Use local storage with builds path
        $disk = 'local';
        $basePath = 'builds';
        $path = "{$basePath}/{$project->id}/{$workspaceId}.zip";

        Storage::disk($disk)->put($path, $response->body());

        return $path;
    }

    /**
     * Get workspace files from builder.
     */
    public function getWorkspaceFiles(Builder $builder, string $workspaceId): array
    {
        $response = Http::timeout(10)
            ->withHeaders(['X-Server-Key' => $builder->server_key])
            ->get("{$builder->full_url}/api/files-workspace/{$workspaceId}");

        if (! $response->successful()) {
            throw new \Exception('Failed to get workspace files');
        }

        return $response->json();
    }

    /**
     * Get a specific file from workspace.
     */
    public function getFile(Builder $builder, string $workspaceId, string $path): array
    {
        $response = Http::timeout(10)
            ->withHeaders(['X-Server-Key' => $builder->server_key])
            ->get("{$builder->full_url}/api/file-workspace/{$workspaceId}", ['path' => $path]);

        if (! $response->successful()) {
            throw new \Exception('Failed to get file');
        }

        return $response->json();
    }

    /**
     * Update a file in workspace.
     */
    public function updateFile(Builder $builder, string $workspaceId, string $path, string $content): bool
    {
        $response = Http::timeout(10)
            ->withHeaders(['X-Server-Key' => $builder->server_key])
            ->put("{$builder->full_url}/api/file-workspace/{$workspaceId}", [
                'path' => $path,
                'content' => $content,
            ]);

        return $response->successful();
    }

    /**
     * Trigger a build on the builder and download the output.
     */
    public function triggerBuild(Builder $builder, string $workspaceId, int|string|null $projectId = null): array
    {
        $response = Http::timeout(300)
            ->withHeaders(['X-Server-Key' => $builder->server_key])
            ->post("{$builder->full_url}/api/build-workspace/{$workspaceId}");

        if (! $response->successful()) {
            throw new \Exception('Build failed: '.$response->body());
        }

        $result = $response->json();

        // If project ID provided, download and extract build output
        if ($projectId && ($result['success'] ?? false)) {
            $this->downloadAndExtractBuildOutput($builder, $workspaceId, $projectId);
            $result['preview_url'] = "/preview/{$projectId}";
        }

        return $result;
    }

    /**
     * Download build output from builder and extract to preview storage.
     */
    protected function downloadAndExtractBuildOutput(Builder $builder, string $workspaceId, int|string $projectId): void
    {
        $response = Http::timeout(60)
            ->withHeaders(['X-Server-Key' => $builder->server_key])
            ->get("{$builder->full_url}/api/build-output-workspace/{$workspaceId}");

        if (! $response->successful()) {
            throw new \Exception('Failed to download build output: '.$response->body());
        }

        // Create preview directory and clear published cache
        $previewPath = "previews/{$projectId}";
        Storage::disk('local')->deleteDirectory($previewPath);
        Storage::disk('local')->makeDirectory($previewPath);
        Storage::disk('local')->deleteDirectory("published/{$projectId}");

        // Extract zip to preview directory
        $zipPath = Storage::disk('local')->path("temp/{$workspaceId}.zip");
        Storage::disk('local')->makeDirectory('temp');
        file_put_contents($zipPath, $response->body());

        $zip = new \ZipArchive;
        if ($zip->open($zipPath) === true) {
            $zip->extractTo(Storage::disk('local')->path($previewPath));
            $zip->close();
        }

        // Inject app config into index.html
        $project = Project::find($projectId);
        if ($project) {
            $this->injectAppConfig($project, $previewPath);
        }

        // Clean up temp file
        @unlink($zipPath);
    }

    /**
     * Get AI suggestions for next steps.
     */
    public function getSuggestions(Builder $builder, string $sessionId): array
    {
        $response = Http::timeout(30)
            ->withHeaders(['X-Server-Key' => $builder->server_key])
            ->get("{$builder->full_url}/api/suggestions/{$sessionId}");

        if (! $response->successful()) {
            return ['suggestions' => []];
        }

        return $response->json();
    }

    /**
     * Build project capabilities payload for the Go builder agent.
     * This tells the agent what dynamic features are available for the project.
     */
    protected function buildProjectCapabilities(Project $project): array
    {
        $user = $project->user;
        $plan = $user?->getCurrentPlan();

        // Firebase is only truly enabled if:
        // 1. Plan allows Firebase AND
        // 2. Valid Firebase config exists (system or custom)
        $firebaseEnabled = false;
        if ($plan?->firebaseEnabled()) {
            $firebaseConfig = $project->getFirebaseConfig();
            $firebaseEnabled = $firebaseConfig !== null;
        }

        return [
            'firebase' => [
                'enabled' => $firebaseEnabled,
                'collection_prefix' => $project->getFirebaseCollectionPrefix(),
            ],
            'storage' => [
                'enabled' => $plan?->fileStorageEnabled() ?? false,
                'max_file_size_mb' => $plan?->getMaxFileSizeMb() ?? 10,
                'allowed_file_types' => $plan?->allowed_file_types ?? [],
            ],
        ];
    }

    /**
     * Build theme preset payload for the Go builder agent.
     */
    protected function buildThemePreset(Project $project): ?array
    {
        $presetId = $project->theme_preset;
        if (! $presetId) {
            return null;
        }

        $preset = config("theme-presets.{$presetId}");
        if (! $preset) {
            return null;
        }

        return [
            'id' => $presetId,
            'name' => $preset['name'],
            'description' => $preset['description'],
            'light' => $preset['light'],
            'dark' => $preset['dark'],
        ];
    }

    /**
     * Build meta tags HTML for the project.
     */
    protected function buildMetaTags(Project $project): string
    {
        $title = htmlspecialchars(
            $project->published_title ?? $project->name ?? 'Webby Project',
            ENT_QUOTES,
            'UTF-8'
        );

        $tags = [];

        // Meta description
        if (! empty($project->published_description)) {
            $description = htmlspecialchars($project->published_description, ENT_QUOTES, 'UTF-8');
            $tags[] = sprintf('<meta name="description" content="%s">', $description);
        }

        // Open Graph
        $tags[] = sprintf('<meta property="og:title" content="%s">', $title);
        $tags[] = '<meta property="og:type" content="website">';

        if (! empty($project->published_description)) {
            $description = htmlspecialchars($project->published_description, ENT_QUOTES, 'UTF-8');
            $tags[] = sprintf('<meta property="og:description" content="%s">', $description);
        }

        if ($project->share_image) {
            $imageUrl = asset('storage/'.$project->share_image);
            $tags[] = sprintf(
                '<meta property="og:image" content="%s">',
                htmlspecialchars($imageUrl, ENT_QUOTES, 'UTF-8')
            );
        }

        if ($project->isPublished()) {
            $tags[] = sprintf(
                '<meta property="og:url" content="%s">',
                htmlspecialchars($project->getPublishedUrl(), ENT_QUOTES, 'UTF-8')
            );
        }

        // Twitter Card
        $tags[] = '<meta name="twitter:card" content="summary_large_image">';
        $tags[] = sprintf('<meta name="twitter:title" content="%s">', $title);

        if (! empty($project->published_description)) {
            $description = htmlspecialchars($project->published_description, ENT_QUOTES, 'UTF-8');
            $tags[] = sprintf('<meta name="twitter:description" content="%s">', $description);
        }

        if ($project->share_image) {
            $imageUrl = asset('storage/'.$project->share_image);
            $tags[] = sprintf(
                '<meta name="twitter:image" content="%s">',
                htmlspecialchars($imageUrl, ENT_QUOTES, 'UTF-8')
            );
        }

        return implode("\n    ", $tags);
    }

    /**
     * Inject meta tags and __APP_CONFIG__ into the built index.html.
     * This provides SEO meta tags and runtime configuration for Firebase, storage API, etc.
     */
    protected function injectAppConfig(Project $project, string $previewDir): void
    {
        $indexPath = Storage::disk('local')->path("{$previewDir}/index.html");

        if (! file_exists($indexPath)) {
            return;
        }

        $html = file_get_contents($indexPath);

        // 1. Replace title tag
        $title = htmlspecialchars(
            $project->published_title ?? $project->name ?? 'Webby Project',
            ENT_QUOTES,
            'UTF-8'
        );
        $html = preg_replace('/<title>.*?<\/title>/i', "<title>{$title}</title>", $html);

        // 2. Build meta tags
        $metaTags = $this->buildMetaTags($project);

        // 3. Build app config script
        $user = $project->user;
        $plan = $user?->getCurrentPlan();

        $config = [
            'apiUrl' => config('app.url'),
            'projectId' => $project->id,
            'apiToken' => $project->api_token,
        ];

        // Add Firebase config if enabled
        if ($plan?->firebaseEnabled()) {
            $firebaseService = app(FirebaseService::class);
            $firebaseConfig = $firebaseService->getConfig($project);
            if ($firebaseConfig) {
                $config['firebase'] = $firebaseConfig;
                $config['firebasePrefix'] = $project->getFirebaseCollectionPrefix();
            }
        }

        $script = sprintf(
            '<script>window.__APP_CONFIG__ = %s;</script>',
            json_encode($config, JSON_UNESCAPED_SLASHES)
        );

        // 4. Inject meta tags + script before </head>
        $injection = $metaTags."\n    ".$script;
        $html = str_replace('</head>', $injection."\n</head>", $html);

        // Note: Inspector script is now injected on-the-fly by PreviewController
        // to keep stored files clean for /app and subdomain routes

        file_put_contents($indexPath, $html);
    }

    /**
     * List all workspace IDs on a builder.
     *
     * @return string[]
     */
    public function listWorkspaces(Builder $builder): array
    {
        $response = Http::timeout(30)
            ->withHeaders(['X-Server-Key' => $builder->server_key])
            ->get("{$builder->full_url}/api/workspaces");

        if (! $response->successful()) {
            throw new \Exception("Failed to list workspaces on builder {$builder->name}: ".$response->body());
        }

        return $response->json('workspace_ids') ?? [];
    }

    /**
     * Request bulk deletion of workspaces from a builder.
     *
     * @param  string[]  $workspaceIds
     * @return array{deleted: int, not_found: int, skipped: int, failed: int, results: array}
     */
    public function cleanupWorkspaces(Builder $builder, array $workspaceIds): array
    {
        $response = Http::timeout(120)
            ->withHeaders(['X-Server-Key' => $builder->server_key])
            ->post("{$builder->full_url}/api/cleanup-workspaces", [
                'workspace_ids' => $workspaceIds,
            ]);

        if (! $response->successful()) {
            throw new \Exception("Failed to cleanup workspaces on builder {$builder->name}: ".$response->body());
        }

        return $response->json();
    }

    /**
     * Apply theme preset to workspace files via Go builder.
     * This writes CSS variables directly to the project's src/index.css file.
     */
    public function applyThemeToWorkspace(Builder $builder, Project $project, string $presetId): bool
    {
        $preset = config("theme-presets.{$presetId}");
        if (! $preset) {
            return false;
        }

        try {
            $response = Http::timeout(30)
                ->withHeaders(['X-Server-Key' => $builder->server_key])
                ->put("{$builder->full_url}/api/theme-workspace/{$project->id}", [
                    'light' => $preset['light'],
                    'dark' => $preset['dark'],
                ]);

            return $response->successful();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to apply theme to workspace', [
                'project_id' => $project->id,
                'preset' => $presetId,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
