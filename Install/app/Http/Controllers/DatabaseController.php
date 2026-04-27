<?php

namespace App\Http\Controllers;

use App\Services\FirebaseAdminService;
use App\Services\FirebaseService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DatabaseController extends Controller
{
    public function __construct(
        protected FirebaseService $firebaseService,
        protected FirebaseAdminService $firebaseAdminService
    ) {}

    /**
     * Display the database management page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $plan = $user->getCurrentPlan();

        // Get user's projects that have Firebase enabled
        $projects = $user->projects()
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(fn ($project) => [
                'id' => $project->id,
                'name' => $project->name,
                'uses_system_firebase' => $project->uses_system_firebase,
                'has_custom_config' => ! $project->uses_system_firebase && ! empty($project->firebase_config),
                'collection_prefix' => $project->getFirebaseCollectionPrefix(),
                'has_admin_sdk' => $project->canUseAdminSdk(),
            ]);

        // Get Firebase feature status
        $firebaseEnabled = $plan?->firebaseEnabled() ?? false;
        $canUseOwnConfig = $plan?->allowsUserFirebaseConfig() ?? false;
        $systemFirebaseConfigured = $this->firebaseService->isSystemConfigured();

        // Get system Firebase config for the frontend (only public parts)
        $systemFirebaseConfig = $firebaseEnabled && $systemFirebaseConfigured
            ? $this->firebaseService->getSystemConfig()
            : null;

        return Inertia::render('Database/Index', [
            'projects' => $projects,
            'firebaseEnabled' => $firebaseEnabled,
            'canUseOwnConfig' => $canUseOwnConfig,
            'systemFirebaseConfigured' => $systemFirebaseConfigured,
            'systemFirebaseConfig' => $systemFirebaseConfig,
            'adminSdkConfigured' => $this->firebaseAdminService->isConfigured(),
        ]);
    }
}
