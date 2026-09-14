<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\FirebaseService;
use App\Services\Mcp\McpTool;

class ProjectFirebaseGetConfigTool extends McpTool
{
    public function __construct(private readonly FirebaseService $firebase) {}

    public function name(): string
    {
        return 'project_firebase_get_config';
    }

    public function description(): string
    {
        return "Get this project's effective Firebase/Firestore configuration and whether it uses the system config or a custom one.";
    }

    public function requiredAbility(): ?string
    {
        return 'firebase:read';
    }

    public function inputSchema(): array
    {
        return ['type' => 'object', 'properties' => new \stdClass];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];
        $plan = $project->user?->getCurrentPlan();

        if (! $plan || ! $plan->firebaseEnabled()) {
            return ['success' => false, 'message' => 'Firebase is not enabled for this project\'s plan.'];
        }

        return [
            'success' => true,
            'config' => $this->firebase->getConfig($project),
            'uses_system_firebase' => $project->uses_system_firebase,
            'can_use_own_config' => $plan->allowsUserFirebaseConfig(),
            'collection_prefix' => $project->getFirebaseCollectionPrefix(),
            'admin_sdk_configured' => $project->canUseAdminSdk(),
        ];
    }
}
