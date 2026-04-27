<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\DomainSettingService;
use App\Services\DomainVerificationService;
use App\Support\CustomDomainHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectCustomDomainController extends Controller
{
    protected DomainSettingService $settingService;

    protected DomainVerificationService $verificationService;

    public function __construct(
        DomainSettingService $settingService,
        DomainVerificationService $verificationService
    ) {
        $this->settingService = $settingService;
        $this->verificationService = $verificationService;
    }

    /**
     * Check if a domain is available.
     */
    public function checkAvailability(Request $request): JsonResponse
    {
        // Check if custom domains are enabled globally
        if (! $this->settingService->isCustomDomainsEnabled()) {
            return response()->json([
                'available' => false,
                'error' => 'Custom domains are not enabled on this platform.',
            ], 403);
        }

        $request->validate([
            'domain' => 'required|string|max:255',
            'exclude_project_id' => 'nullable|string',
        ]);

        $domain = CustomDomainHelper::normalize($request->input('domain'));

        // Validate format
        $errors = CustomDomainHelper::validate($domain);
        if (! empty($errors)) {
            return response()->json([
                'available' => false,
                'error' => $errors[0],
            ]);
        }

        // Check if domain is a subdomain of the base domain (not allowed)
        $baseDomain = $this->settingService->getBaseDomain();
        if ($baseDomain && CustomDomainHelper::isSubdomainOfBase($domain, $baseDomain)) {
            return response()->json([
                'available' => false,
                'error' => 'You cannot use the platform base domain as a custom domain.',
            ]);
        }

        // Check availability
        $excludeId = $request->input('exclude_project_id');
        $available = CustomDomainHelper::isAvailable($domain, $excludeId);

        return response()->json([
            'available' => $available,
            'error' => $available ? null : 'This domain is already in use.',
        ]);
    }

    /**
     * Store a custom domain for a project.
     */
    public function store(Request $request, Project $project): JsonResponse
    {
        // Authorize access
        $this->authorize('update', $project);

        // Check if custom domains are enabled globally
        if (! $this->settingService->isCustomDomainsEnabled()) {
            return response()->json([
                'success' => false,
                'error' => 'Custom domains are not enabled on this platform.',
            ], 403);
        }

        // Check if user can use custom domains
        $user = $request->user();
        if (! $user->canUseCustomDomains()) {
            return response()->json([
                'success' => false,
                'error' => 'Your plan does not include custom domain publishing.',
            ], 403);
        }

        // Check if user can create more custom domains
        if (! $user->canCreateMoreCustomDomains() && ! $project->custom_domain) {
            return response()->json([
                'success' => false,
                'error' => 'You have reached your custom domain limit.',
            ], 403);
        }

        $request->validate([
            'domain' => 'required|string|max:255',
        ]);

        $domain = CustomDomainHelper::normalize($request->input('domain'));

        // Validate format
        $errors = CustomDomainHelper::validate($domain);
        if (! empty($errors)) {
            return response()->json([
                'success' => false,
                'error' => $errors[0],
            ], 422);
        }

        // Check if domain is a subdomain of the base domain
        $baseDomain = $this->settingService->getBaseDomain();
        if ($baseDomain && CustomDomainHelper::isSubdomainOfBase($domain, $baseDomain)) {
            return response()->json([
                'success' => false,
                'error' => 'You cannot use the platform base domain as a custom domain.',
            ], 422);
        }

        // Check availability
        if (! CustomDomainHelper::isAvailable($domain, $project->id)) {
            return response()->json([
                'success' => false,
                'error' => 'This domain is already in use.',
            ], 422);
        }

        // Update project
        $project->update([
            'custom_domain' => $domain,
            'custom_domain_verified' => false,
            'custom_domain_ssl_status' => null,
            'custom_domain_verified_at' => null,
        ]);

        // Get verification instructions
        $instructions = $this->verificationService->getVerificationInstructions($project->fresh());

        return response()->json([
            'success' => true,
            'domain' => $domain,
            'verification' => $instructions,
        ]);
    }

    /**
     * Verify a project's custom domain.
     */
    public function verify(Project $project): JsonResponse
    {
        // Authorize access
        $this->authorize('update', $project);

        if (! $project->custom_domain) {
            return response()->json([
                'success' => false,
                'error' => 'No custom domain configured for this project.',
            ], 422);
        }

        if ($project->custom_domain_verified) {
            return response()->json([
                'success' => true,
                'already_verified' => true,
                'message' => 'Domain is already verified.',
            ]);
        }

        $result = $this->verificationService->verify($project);

        if ($result['success']) {
            return response()->json([
                'success' => true,
                'message' => 'Domain verified successfully.',
            ]);
        }

        return response()->json([
            'success' => false,
            'error' => $result['error'],
        ], 422);
    }

    /**
     * Get verification instructions for a project's custom domain.
     */
    public function instructions(Project $project): JsonResponse
    {
        // Authorize access
        $this->authorize('view', $project);

        if (! $project->custom_domain) {
            return response()->json([
                'success' => false,
                'error' => 'No custom domain configured for this project.',
            ], 422);
        }

        $instructions = $this->verificationService->getVerificationInstructions($project);

        return response()->json([
            'success' => true,
            'instructions' => $instructions,
            'verified' => $project->custom_domain_verified,
            'ssl_status' => $project->custom_domain_ssl_status,
        ]);
    }

    /**
     * Remove a custom domain from a project.
     */
    public function destroy(Project $project): JsonResponse
    {
        // Authorize access
        $this->authorize('update', $project);

        if (! $project->custom_domain) {
            return response()->json([
                'success' => false,
                'error' => 'No custom domain configured for this project.',
            ], 422);
        }

        $project->update([
            'custom_domain' => null,
            'custom_domain_verified' => false,
            'custom_domain_ssl_status' => null,
            'custom_domain_verified_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Custom domain removed successfully.',
        ]);
    }
}
