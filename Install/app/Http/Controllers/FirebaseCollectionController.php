<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\FirebaseAdminService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class FirebaseCollectionController extends Controller
{
    public function index(Request $request, FirebaseAdminService $service): JsonResponse
    {
        $projectId = $request->query('project_id');
        $prefix = $request->query('prefix', '');

        if ($projectId) {
            $project = Project::find($projectId);

            if (! $project) {
                return response()->json([
                    'collections' => [],
                    'admin_configured' => false,
                    'error' => 'Project not found',
                ], 404);
            }

            Gate::authorize('view', $project);

            return $this->getCollectionsForProject($project, $service, $prefix);
        }

        // Fallback to system-wide behavior (backward compatibility)
        if (! $service->isConfigured()) {
            return response()->json([
                'collections' => [],
                'admin_configured' => false,
            ]);
        }

        try {
            $collections = $service->listCollections($prefix);

            return response()->json([
                'collections' => $collections,
                'admin_configured' => true,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'admin_configured' => true,
            ], 500);
        }
    }

    private function getCollectionsForProject(Project $project, FirebaseAdminService $service, string $prefix): JsonResponse
    {
        if ($project->uses_system_firebase) {
            if (! $service->isConfigured()) {
                return response()->json([
                    'collections' => [],
                    'admin_configured' => false,
                ]);
            }

            try {
                $collections = $service->listCollections($prefix);

                return response()->json([
                    'collections' => $collections,
                    'admin_configured' => true,
                ]);
            } catch (\Exception $e) {
                return response()->json([
                    'error' => $e->getMessage(),
                    'admin_configured' => true,
                ], 500);
            }
        }

        $credentials = $project->getFirebaseAdminServiceAccount();

        if (! $credentials) {
            return response()->json([
                'collections' => [],
                'admin_configured' => false,
            ]);
        }

        try {
            $collections = $service->listCollectionsWithCredentials($credentials, $prefix);

            return response()->json([
                'collections' => $collections,
                'admin_configured' => true,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'admin_configured' => true,
            ], 500);
        }
    }
}
