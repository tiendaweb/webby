<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\FirebaseAdminService;
use Illuminate\Http\JsonResponse;

class BuilderFirestoreController extends Controller
{
    /**
     * List Firestore collections for a project (for builder AI agent).
     *
     * GET /api/builder/projects/{project}/firestore/collections
     */
    public function collections(Project $project, FirebaseAdminService $service): JsonResponse
    {
        // Check if Firebase is enabled for this project via user's plan
        $user = $project->user;
        $plan = $user?->getCurrentPlan();

        if (! $plan || ! $plan->firebaseEnabled()) {
            return response()->json([
                'success' => false,
                'error' => 'firebase_not_enabled',
                'message' => 'Firebase is not enabled for this project. The user needs to upgrade their plan to enable Firebase.',
                'collections' => [],
            ]);
        }

        // Get credentials (system or project-specific)
        $credentials = null;
        if ($project->uses_system_firebase) {
            $credentials = $service->getServiceAccount();
            if (! $credentials) {
                return response()->json([
                    'success' => false,
                    'error' => 'firebase_not_configured',
                    'message' => 'Firebase is enabled but the system Firebase Admin SDK is not configured.',
                    'collections' => [],
                ]);
            }
        } else {
            $credentials = $project->getFirebaseAdminServiceAccount();
            if (! $credentials) {
                return response()->json([
                    'success' => false,
                    'error' => 'firebase_not_configured',
                    'message' => 'Firebase is enabled but the project does not have Admin SDK credentials configured.',
                    'collections' => [],
                ]);
            }
        }

        try {
            $prefix = $project->getFirebaseCollectionPrefix();
            $collections = $service->getCollectionsWithMetadata($credentials, $prefix);

            if (empty($collections)) {
                return response()->json([
                    'success' => true,
                    'message' => 'Firebase is configured but no collections exist yet. Data will be stored when the user creates it.',
                    'collections' => [],
                    'collection_prefix' => $prefix,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => null,
                'collections' => $collections,
                'collection_prefix' => $prefix,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'firebase_error',
                'message' => 'Failed to fetch Firestore collections: '.$e->getMessage(),
                'collections' => [],
            ]);
        }
    }
}
