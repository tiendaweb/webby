<?php

namespace App\Http\Controllers;

use App\Models\Builder;
use App\Models\Project;
use App\Models\SystemSetting;
use App\Services\BuilderService;
use App\Services\DomainSettingService;
use App\Services\FirebaseAdminService;
use App\Services\FirebaseService;
use App\Support\SubdomainHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProjectSettingsController extends Controller
{
    public function __construct(
        protected FirebaseService $firebaseService,
        protected FirebaseAdminService $firebaseAdminService,
        protected DomainSettingService $domainSettingService
    ) {}

    public function show(Request $request, Project $project): Response
    {
        $this->authorize('update', $project);

        $user = $request->user();
        $plan = $user->getCurrentPlan();
        $baseDomain = SystemSetting::get('domain_base_domain', config('app.base_domain', 'example.com'));

        // Firebase settings
        $firebaseSettings = null;
        if ($plan) {
            $firebaseSettings = [
                'enabled' => $plan->firebaseEnabled(),
                'canUseOwnConfig' => $plan->allowsUserFirebaseConfig(),
                'usesSystemFirebase' => $project->uses_system_firebase,
                'customConfig' => $project->uses_system_firebase ? null : $project->firebase_config,
                'systemConfigured' => $this->firebaseService->isSystemConfigured(),
                'collectionPrefix' => $project->getFirebaseCollectionPrefix(),
                'adminSdkConfigured' => $project->canUseAdminSdk(),
                'adminSdkStatus' => $this->getAdminSdkStatusArray($project),
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
            ];
        }

        // Custom domain settings
        $customDomainSettings = null;
        if ($this->domainSettingService->isCustomDomainsEnabled()) {
            $customDomainSettings = [
                'enabled' => $user->canUseCustomDomains(),
                'canCreateMore' => $user->canCreateMoreCustomDomains(),
                'usage' => $user->getCustomDomainUsage(),
                'baseDomain' => $this->domainSettingService->getBaseDomain(),
            ];
        }

        return Inertia::render('Project/Settings', [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'subdomain' => $project->subdomain,
                'published_title' => $project->published_title,
                'published_description' => $project->published_description,
                'published_visibility' => $project->published_visibility,
                'share_image' => $project->share_image,
                'custom_instructions' => $project->custom_instructions,
                'api_token' => $project->api_token,
                'custom_domain' => $project->custom_domain,
                'custom_domain_verified' => $project->custom_domain_verified,
                'custom_domain_ssl_status' => $project->custom_domain_ssl_status,
            ],
            'baseDomain' => $baseDomain,
            'canUseSubdomains' => SystemSetting::get('domain_enable_subdomains', false) && $user->canUseSubdomains(),
            'canCreateMoreSubdomains' => SystemSetting::get('domain_enable_subdomains', false) && $user->canCreateMoreSubdomains(),
            'canUsePrivateVisibility' => $user->canUsePrivateVisibility(),
            'subdomainUsage' => $user->getSubdomainUsage(),
            'suggestedSubdomain' => $project->subdomain ?? SubdomainHelper::generateFromString($project->name),
            'firebase' => $firebaseSettings,
            'storage' => $storageSettings,
            'customDomain' => $customDomainSettings,
            'subdomainsGloballyEnabled' => $this->domainSettingService->isSubdomainsEnabled(),
            'customDomainsGloballyEnabled' => $this->domainSettingService->isCustomDomainsEnabled(),
        ]);
    }

    public function updateGeneral(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'published_title' => 'nullable|string|max:255',
            'published_description' => 'nullable|string|max:150',
            'published_visibility' => 'required|in:public,private',
        ]);

        if ($validated['published_visibility'] === 'private' && ! $request->user()->canUsePrivateVisibility()) {
            return back()->withErrors(['published_visibility' => 'Your plan does not include private visibility.']);
        }

        $project->update($validated);

        return back()->with('success', 'Settings updated.');
    }

    public function updateKnowledge(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'custom_instructions' => 'nullable|string|max:500',
        ]);

        $project->update($validated);

        return back()->with('success', 'Custom instructions updated.');
    }

    public function uploadShareImage(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $request->validate([
            'share_image' => 'required|image|max:2048|mimes:jpg,jpeg,png,webp',
        ]);

        if ($project->share_image) {
            Storage::disk('public')->delete($project->share_image);
        }

        $path = $request->file('share_image')->store('share-images', 'public');
        $project->update(['share_image' => $path]);

        return back()->with('success', 'Share image uploaded.');
    }

    public function deleteShareImage(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        if ($project->share_image) {
            Storage::disk('public')->delete($project->share_image);
            $project->update(['share_image' => null]);
        }

        return back()->with('success', 'Share image removed.');
    }

    /**
     * Upload a thumbnail image from base64 data (captured from preview iframe).
     */
    public function uploadThumbnail(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $request->validate([
            'image' => 'required|string',
        ]);

        // Delete old thumbnail if exists
        if ($project->thumbnail) {
            Storage::disk('public')->delete($project->thumbnail);
        }

        // Decode base64 and save
        $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $request->image));
        $path = 'thumbnails/'.$project->id.'.png';
        Storage::disk('public')->put($path, $imageData);

        // Update thumbnail path and force updated_at refresh for cache busting
        $project->thumbnail = $path;
        $project->touch();

        return response()->json(['success' => true, 'path' => $path]);
    }

    /**
     * Generate a new API token for the project.
     */
    public function generateApiToken(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        if ($project->hasApiToken()) {
            return response()->json([
                'error' => 'Project already has an API token. Use regenerate to create a new one.',
            ], 422);
        }

        $token = $project->generateApiToken();

        return response()->json([
            'token' => $token,
            'message' => 'API token generated successfully.',
        ]);
    }

    /**
     * Regenerate the API token for the project.
     */
    public function regenerateApiToken(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $token = $project->regenerateApiToken();

        return response()->json([
            'token' => $token,
            'message' => 'API token regenerated successfully.',
        ]);
    }

    /**
     * Revoke the API token for the project.
     */
    public function revokeApiToken(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $project->revokeApiToken();

        return response()->json([
            'message' => 'API token revoked successfully.',
        ]);
    }

    /**
     * Update the theme preset for a project.
     * Applies the theme to workspace files via Go builder.
     */
    public function updateTheme(Request $request, Project $project, BuilderService $builderService): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'theme_preset' => 'required|string|in:default,arctic,summer,fragrant,slate,feminine,forest,midnight,coral,mocha,ocean,ruby',
        ]);

        // 1. Save preference to database
        $project->update(['theme_preset' => $validated['theme_preset']]);

        // 2. Apply theme to workspace files via Go builder
        $builder = $project->builder ?? Builder::getDefaultBuilder();
        if (! $builder) {
            return response()->json([
                'success' => true,
                'warning' => 'Theme saved but could not apply to workspace. No builder available.',
            ]);
        }

        $applied = $builderService->applyThemeToWorkspace($builder, $project, $validated['theme_preset']);

        if (! $applied) {
            return response()->json([
                'success' => true,
                'warning' => 'Theme saved but could not apply to workspace. Build a preview first.',
            ]);
        }

        // 3. Trigger rebuild to get updated dist/
        try {
            $builderService->triggerBuild($builder, $project->id, $project->id);
        } catch (\Exception $e) {
            return response()->json([
                'success' => true,
                'warning' => 'Theme applied to source files but rebuild failed: '.$e->getMessage(),
            ]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Get Admin SDK status array for a project.
     */
    private function getAdminSdkStatusArray(Project $project): array
    {
        if ($project->uses_system_firebase) {
            $configured = $this->firebaseAdminService->isConfigured();
            $info = $configured ? $this->firebaseAdminService->getProjectInfo() : null;

            return [
                'configured' => $configured,
                'is_system' => true,
                'project_id' => $info['project_id'] ?? null,
                'client_email' => $info['client_email'] ?? null,
            ];
        }

        $credentials = $project->getFirebaseAdminServiceAccount();
        if (! $credentials) {
            return [
                'configured' => false,
                'is_system' => false,
                'project_id' => null,
                'client_email' => null,
            ];
        }

        $info = $this->firebaseAdminService->getProjectInfoFromCredentials($credentials);

        return [
            'configured' => true,
            'is_system' => false,
            'project_id' => $info['project_id'],
            'client_email' => $info['client_email'],
        ];
    }
}
