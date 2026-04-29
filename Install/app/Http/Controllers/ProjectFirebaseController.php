<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectDatabaseSetting;
use App\Services\FirebaseAdminService;
use App\Services\FirebaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ProjectFirebaseController extends Controller
{
    public function __construct(
        protected FirebaseService $firebaseService,
        protected FirebaseAdminService $firebaseAdminService
    ) {}

    /**
     * Get Firebase config for a project.
     */
    public function getConfig(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $user = $project->user;
        $plan = $user?->getCurrentPlan();

        if (! $plan || ! $plan->firebaseEnabled()) {
            return response()->json([
                'error' => 'Firebase is not enabled for your plan.',
            ], 403);
        }

        $config = $this->firebaseService->getConfig($project);
        $isSystemConfig = $project->uses_system_firebase;

        return response()->json([
            'config' => $config,
            'uses_system_firebase' => $isSystemConfig,
            'can_use_own_config' => $plan->allowsUserFirebaseConfig(),
            'collection_prefix' => $project->getFirebaseCollectionPrefix(),
            'admin_sdk_configured' => $project->canUseAdminSdk(),
        ]);
    }

    /**
     * Update Firebase config for a project.
     */
    public function updateConfig(Project $project, Request $request): JsonResponse
    {
        Gate::authorize('update', $project);

        $user = $project->user;
        $plan = $user?->getCurrentPlan();

        if (! $plan || ! $plan->firebaseEnabled()) {
            return response()->json([
                'error' => 'Firebase is not enabled for your plan.',
            ], 403);
        }

        $validated = $request->validate([
            'use_system_firebase' => 'required|boolean',
            'config' => 'nullable|array',
            'config.apiKey' => 'required_if:use_system_firebase,false|string',
            'config.authDomain' => 'required_if:use_system_firebase,false|string',
            'config.projectId' => 'required_if:use_system_firebase,false|string',
            'config.storageBucket' => 'required_if:use_system_firebase,false|string',
            'config.messagingSenderId' => 'required_if:use_system_firebase,false|string',
            'config.appId' => 'required_if:use_system_firebase,false|string',
        ]);

        if ($validated['use_system_firebase']) {
            // Switch to system Firebase
            $project->update([
                'uses_system_firebase' => true,
                'firebase_config' => null,
            ]);

            return response()->json([
                'message' => 'Switched to system Firebase configuration.',
                'uses_system_firebase' => true,
            ]);
        }

        // Custom config - check if plan allows it
        if (! $plan->allowsUserFirebaseConfig()) {
            return response()->json([
                'error' => 'Your plan does not allow custom Firebase configurations.',
            ], 403);
        }

        // Validate the custom config
        $validation = $this->firebaseService->validateConfig($validated['config']);

        if (! $validation['valid']) {
            return response()->json([
                'error' => 'Invalid Firebase configuration.',
                'errors' => $validation['errors'],
            ], 422);
        }

        // Save custom config
        $project->update([
            'uses_system_firebase' => false,
            'firebase_config' => $validated['config'],
        ]);

        return response()->json([
            'message' => 'Firebase configuration updated successfully.',
            'uses_system_firebase' => false,
        ]);
    }

    /**
     * Reset to system Firebase config.
     */
    public function resetConfig(Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $project->update([
            'uses_system_firebase' => true,
            'firebase_config' => null,
        ]);

        return response()->json([
            'message' => 'Reset to system Firebase configuration.',
            'uses_system_firebase' => true,
        ]);
    }

    /**
     * Generate security rules for a project.
     */
    public function generateRules(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $user = $project->user;
        $plan = $user?->getCurrentPlan();

        if (! $plan || ! $plan->firebaseEnabled()) {
            return response()->json([
                'error' => 'Firebase is not enabled for your plan.',
            ], 403);
        }

        $rules = $this->firebaseService->generateSecurityRules($project);

        return response()->json([
            'rules' => $rules,
        ]);
    }

    /**
     * Test Firebase connection.
     */
    public function testConnection(Project $project, Request $request): JsonResponse
    {
        Gate::authorize('view', $project);

        $user = $project->user;
        $plan = $user?->getCurrentPlan();

        if (! $plan || ! $plan->firebaseEnabled()) {
            return response()->json([
                'error' => 'Firebase is not enabled for your plan.',
            ], 403);
        }

        // If custom config provided, test that; otherwise test current config
        if ($request->has('config')) {
            $config = $request->input('config');
        } else {
            $config = $this->firebaseService->getConfig($project);
        }

        if (! $config) {
            return response()->json([
                'success' => false,
                'error' => 'No Firebase configuration available.',
            ]);
        }

        $result = $this->firebaseService->testConnection($config);

        return response()->json($result);
    }

    
    public function getDatabaseWizard(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $setting = $project->databaseSetting;

        return response()->json([
            'database_mode' => $setting?->database_mode ?? 'none',
            'credentials' => $setting?->credentials ?? [],
            'base_paths' => $setting?->base_paths ?? [],
            'is_connected' => $setting?->is_connected ?? false,
            'last_tested_at' => $setting?->last_tested_at?->toISOString(),
            'last_error' => $setting?->last_error,
        ]);
    }

    public function saveDatabaseWizard(Project $project, Request $request): JsonResponse
    {
        Gate::authorize('update', $project);

        $validated = $request->validate([
            'database_mode' => 'required|in:none,firebase,custom_api',
            'credentials' => 'nullable|array',
            'credentials.api_base_url' => 'nullable|required_if:database_mode,custom_api|url',
            'credentials.api_key' => 'nullable|string|max:2048',
            'credentials.project_id' => 'nullable|string|max:255',
            'base_paths' => 'nullable|array',
            'base_paths.*' => 'string|max:255',
        ]);

        $basePaths = array_values(array_filter($validated['base_paths'] ?? []));
        if (($validated['database_mode'] ?? 'none') !== 'none' && count($basePaths) === 0) {
            return response()->json(['error' => 'At least one base path/collection is required.'], 422);
        }

        if (! empty($basePaths) && ! str_starts_with($basePaths[0], 'project_'.$project->id)) {
            return response()->json(['error' => 'The first base path must start with project_'.$project->id.' to enforce project namespace isolation.'], 422);
        }

        $setting = ProjectDatabaseSetting::updateOrCreate(
            ['project_id' => $project->id],
            [
                'database_mode' => $validated['database_mode'],
                'credentials' => $validated['credentials'] ?? [],
                'base_paths' => $basePaths,
                'last_error' => null,
            ]
        );

        return response()->json([
            'message' => 'Database wizard configuration saved.',
            'setting' => $setting,
        ]);
    }

    public function testDatabaseWizard(Project $project, Request $request): JsonResponse
    {
        Gate::authorize('view', $project);

        $validated = $request->validate([
            'database_mode' => 'required|in:none,firebase,custom_api',
            'credentials' => 'nullable|array',
        ]);

        $mode = $validated['database_mode'];
        $credentials = $validated['credentials'] ?? [];
        $success = false;
        $error = null;

        if ($mode === 'none') {
            $success = true;
        } elseif ($mode === 'firebase') {
            $config = $this->firebaseService->getConfig($project);
            if ($config) {
                $result = $this->firebaseService->testConnection($config);
                $success = (bool) ($result['success'] ?? false);
                $error = $result['error'] ?? null;
            } else {
                $error = 'No Firebase configuration available for this project.';
            }
        } elseif ($mode === 'custom_api') {
            $url = $credentials['api_base_url'] ?? null;
            if (! $url) {
                $error = 'api_base_url is required for custom_api mode.';
            } else {
                try {
                    $response = \Illuminate\Support\Facades\Http::timeout(10)->get(rtrim($url, '/'));
                    $success = $response->successful();
                    if (! $success) {
                        $error = 'Custom API responded with status '.$response->status();
                    }
                } catch (\Throwable $e) {
                    $error = $e->getMessage();
                }
            }
        }

        $setting = ProjectDatabaseSetting::firstOrCreate(['project_id' => $project->id], ['database_mode' => $mode]);
        $setting->update([
            'database_mode' => $mode,
            'is_connected' => $success,
            'last_tested_at' => now(),
            'last_error' => $success ? null : $error,
        ]);

        return response()->json([
            'success' => $success,
            'error' => $error,
            'last_tested_at' => $setting->last_tested_at?->toISOString(),
        ]);
    }
/**
     * Get Admin SDK status for a project.
     */
    public function getAdminSdkStatus(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        if ($project->uses_system_firebase) {
            $configured = $this->firebaseAdminService->isConfigured();
            $info = $configured ? $this->firebaseAdminService->getProjectInfo() : null;

            return response()->json([
                'configured' => $configured,
                'is_system' => true,
                'project_id' => $info['project_id'] ?? null,
                'client_email' => $info['client_email'] ?? null,
            ]);
        }

        $credentials = $project->getFirebaseAdminServiceAccount();
        if (! $credentials) {
            return response()->json([
                'configured' => false,
                'is_system' => false,
                'project_id' => null,
                'client_email' => null,
            ]);
        }

        $info = $this->firebaseAdminService->getProjectInfoFromCredentials($credentials);

        return response()->json([
            'configured' => true,
            'is_system' => false,
            'project_id' => $info['project_id'],
            'client_email' => $info['client_email'],
        ]);
    }

    /**
     * Upload Firebase Admin SDK service account for a project.
     */
    public function uploadAdminSdk(Project $project, Request $request): JsonResponse
    {
        Gate::authorize('update', $project);

        $user = $project->user;
        $plan = $user?->getCurrentPlan();

        if (! $plan || ! $plan->firebaseEnabled()) {
            return response()->json(['error' => 'Firebase is not enabled for your plan.'], 403);
        }

        if (! $plan->allowsUserFirebaseConfig()) {
            return response()->json(['error' => 'Your plan does not allow custom Firebase configurations.'], 403);
        }

        if ($project->uses_system_firebase) {
            return response()->json([
                'error' => 'Admin SDK upload is only available when using custom Firebase. Switch to custom Firebase first.',
            ], 422);
        }

        $request->validate([
            'file' => 'required|file|max:50',
        ]);

        $file = $request->file('file');

        if ($file->getClientOriginalExtension() !== 'json') {
            return response()->json(['error' => 'File must be a JSON file.'], 422);
        }

        $json = json_decode(file_get_contents($file->path()), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json(['error' => 'Invalid JSON file.'], 422);
        }

        $validation = $this->firebaseAdminService->validateServiceAccount($json);
        if (! $validation['valid']) {
            return response()->json([
                'error' => 'Invalid service account: '.implode(', ', $validation['errors']),
            ], 422);
        }

        // Test connection before saving
        $result = $this->firebaseAdminService->testConnectionWithCredentials($json);
        if (! $result['success']) {
            return response()->json([
                'error' => 'Connection test failed: '.$result['error'],
            ], 422);
        }

        $project->update(['firebase_admin_service_account' => $json]);

        $projectInfo = $this->firebaseAdminService->getProjectInfoFromCredentials($json);

        return response()->json([
            'message' => 'Firebase Admin SDK configured successfully.',
            'project_id' => $projectInfo['project_id'],
            'client_email' => $projectInfo['client_email'],
        ]);
    }

    /**
     * Test Firebase Admin SDK connection for a project.
     */
    public function testAdminSdk(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        if ($project->uses_system_firebase) {
            $result = $this->firebaseAdminService->testConnection();
        } else {
            $credentials = $project->getFirebaseAdminServiceAccount();
            if (! $credentials) {
                return response()->json([
                    'success' => false,
                    'error' => 'No Admin SDK credentials configured for this project.',
                ]);
            }
            $result = $this->firebaseAdminService->testConnectionWithCredentials($credentials);
        }

        if ($result['success']) {
            return response()->json(['success' => true]);
        }

        return response()->json(['success' => false, 'error' => $result['error']], 422);
    }

    /**
     * Delete Firebase Admin SDK credentials for a project.
     */
    public function deleteAdminSdk(Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $project->update(['firebase_admin_service_account' => null]);

        return response()->json(['message' => 'Firebase Admin SDK credentials removed.']);
    }
}
