<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\FirebaseService;
use App\Services\Mcp\McpTool;

/**
 * Mirrors ProjectFirebaseController::updateConfig() exactly — same plan
 * gating (firebaseEnabled/allowsUserFirebaseConfig) and validation via
 * FirebaseService::validateConfig(), since this writes directly to
 * Project.firebase_config (encrypted).
 */
class ProjectFirebaseUpdateConfigTool extends McpTool
{
    public function __construct(private readonly FirebaseService $firebase) {}

    public function name(): string
    {
        return 'project_firebase_update_config';
    }

    public function description(): string
    {
        return "Switch this project to the system Firebase config, or set a custom one. Set use_system_firebase=true to switch back to system config (config fields are then ignored).";
    }

    public function requiredAbility(): ?string
    {
        return 'firebase:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'use_system_firebase' => ['type' => 'boolean'],
                'config' => [
                    'type' => 'object',
                    'description' => 'Required when use_system_firebase is false.',
                    'properties' => [
                        'apiKey' => ['type' => 'string'],
                        'authDomain' => ['type' => 'string'],
                        'projectId' => ['type' => 'string'],
                        'storageBucket' => ['type' => 'string'],
                        'messagingSenderId' => ['type' => 'string'],
                        'appId' => ['type' => 'string'],
                    ],
                ],
            ],
            'required' => ['use_system_firebase'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];
        $plan = $project->user?->getCurrentPlan();

        if (! $plan || ! $plan->firebaseEnabled()) {
            return ['success' => false, 'message' => 'Firebase is not enabled for this project\'s plan.'];
        }

        $useSystem = (bool) ($arguments['use_system_firebase'] ?? true);

        if ($useSystem) {
            $project->update(['uses_system_firebase' => true, 'firebase_config' => null]);

            return ['success' => true, 'uses_system_firebase' => true, 'message' => 'Switched to system Firebase configuration.'];
        }

        if (! $plan->allowsUserFirebaseConfig()) {
            return ['success' => false, 'message' => "This project's plan does not allow custom Firebase configurations."];
        }

        $config = is_array($arguments['config'] ?? null) ? $arguments['config'] : [];
        $required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        $missing = array_filter($required, fn ($field) => empty($config[$field]));

        if ($missing) {
            return ['success' => false, 'message' => 'Missing required config fields: '.implode(', ', $missing)];
        }

        $validation = $this->firebase->validateConfig($config);

        if (! $validation['valid']) {
            return ['success' => false, 'message' => 'Invalid Firebase configuration.', 'errors' => $validation['errors']];
        }

        $project->update(['uses_system_firebase' => false, 'firebase_config' => $config]);

        return ['success' => true, 'uses_system_firebase' => false, 'message' => 'Firebase configuration updated successfully.'];
    }
}
