<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\FirebaseService;
use App\Services\Mcp\McpTool;

class ProjectFirebaseTestConnectionTool extends McpTool
{
    public function __construct(private readonly FirebaseService $firebase) {}

    public function name(): string
    {
        return 'project_firebase_test_connection';
    }

    public function description(): string
    {
        return "Test the project's currently effective Firebase configuration by pinging the Firestore REST API.";
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
        $config = $this->firebase->getConfig($project);

        if (! $config) {
            return ['success' => false, 'message' => 'No Firebase configuration is set for this project.'];
        }

        $result = $this->firebase->testConnection($config);

        return $result['success']
            ? ['success' => true, 'message' => $result['message']]
            : ['success' => false, 'message' => $result['error']];
    }
}
