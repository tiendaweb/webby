<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\SystemSetting;
use App\Support\SubdomainHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectPublishController extends Controller
{
    /**
     * Check subdomain availability.
     */
    public function checkAvailability(Request $request): JsonResponse
    {
        // Check if subdomains are enabled globally
        if (! SystemSetting::get('domain_enable_subdomains', false)) {
            return response()->json([
                'available' => false,
                'errors' => ['Subdomain publishing is not enabled on this platform.'],
            ], 403);
        }

        $validated = $request->validate([
            'subdomain' => 'required|string|max:63',
            'project_id' => 'nullable|string',
        ]);

        $subdomain = SubdomainHelper::normalize($validated['subdomain']);
        $errors = SubdomainHelper::validate($subdomain);

        if (! empty($errors)) {
            return response()->json([
                'available' => false,
                'errors' => $errors,
            ]);
        }

        $available = SubdomainHelper::isAvailable(
            $subdomain,
            $validated['project_id'] ?? null
        );

        return response()->json([
            'available' => $available,
            'errors' => $available ? [] : ['This subdomain is already taken.'],
        ]);
    }

    /**
     * Publish project to subdomain.
     */
    public function publish(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        // Check if subdomains are enabled globally
        if (! SystemSetting::get('domain_enable_subdomains', false)) {
            return response()->json([
                'error' => 'Subdomain publishing is not enabled on this platform.',
            ], 403);
        }

        $user = $request->user();

        // Check plan permissions
        if (! $user->canUseSubdomains()) {
            return response()->json([
                'error' => 'Your plan does not include subdomain publishing.',
            ], 403);
        }

        // Check subdomain limit (only for new subdomain)
        $isNewSubdomain = $project->subdomain === null;
        if ($isNewSubdomain && ! $user->canCreateMoreSubdomains()) {
            return response()->json([
                'error' => 'You have reached your subdomain limit.',
            ], 403);
        }

        $validated = $request->validate([
            'subdomain' => 'required|string|max:63',
            'visibility' => 'required|in:public,private',
        ]);

        // Validate subdomain
        $subdomain = SubdomainHelper::normalize($validated['subdomain']);
        $errors = SubdomainHelper::validate($subdomain);

        if (! empty($errors)) {
            return response()->json(['error' => $errors[0]], 422);
        }

        if (! SubdomainHelper::isAvailable($subdomain, $project->id)) {
            return response()->json(['error' => 'This subdomain is already taken.'], 422);
        }

        // Check private visibility permission
        if ($validated['visibility'] === 'private' && ! $user->canUsePrivateVisibility()) {
            return response()->json([
                'error' => 'Your plan does not include private visibility.',
            ], 403);
        }

        $project->update([
            'subdomain' => $subdomain,
            'published_title' => $project->published_title ?? $project->name,
            'published_description' => $project->published_description ?? '',
            'published_visibility' => $validated['visibility'],
            'published_at' => $project->published_at ?? now(),
        ]);

        return response()->json([
            'success' => true,
            'project' => $project->fresh(),
            'url' => $project->getPublishedUrl(),
        ]);
    }

    /**
     * Unpublish project.
     */
    public function unpublish(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $project->update([
            'subdomain' => null,
            'published_at' => null,
        ]);

        return response()->json(['success' => true]);
    }
}
