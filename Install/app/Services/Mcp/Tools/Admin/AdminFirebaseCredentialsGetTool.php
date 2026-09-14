<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Firestore\FirestoreDataService;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;

/**
 * What database a customer site is actually wired to, and whether it is
 * reachable.
 *
 * The private key is never returned — knowing a service account exists is
 * all a connector needs, and MCP results end up in a third party's
 * conversation history.
 */
class AdminFirebaseCredentialsGetTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(private readonly FirestoreDataService $firestore) {}

    public function name(): string
    {
        return 'admin_firebase_credentials_get';
    }

    public function description(): string
    {
        return "Show how one customer site's database is configured: its own Firebase project or the shared platform one, "
            .'the client SDK config, whether an admin service account is present, and a live reachability check. Secrets are masked.';
    }

    public function requiredAbility(): ?string
    {
        return 'firestore:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.'],
                'test' => ['type' => 'boolean', 'default' => true, 'description' => 'Try listing collections to confirm the credentials work.'],
            ],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $project = $this->resolveProject($arguments);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        $serviceAccount = $project->firebase_admin_service_account;
        $clientConfig = $project->firebase_config;

        $payload = [
            'success' => true,
            'project_id' => $project->id,
            'uses_system_firebase' => (bool) $project->uses_system_firebase,
            'has_own_service_account' => is_array($serviceAccount) && ! empty($serviceAccount['private_key']),
            'service_account' => is_array($serviceAccount) ? [
                'project_id' => $serviceAccount['project_id'] ?? null,
                'client_email' => $serviceAccount['client_email'] ?? null,
                'private_key' => isset($serviceAccount['private_key']) ? '••••••• (hidden)' : null,
            ] : null,
            'client_config' => is_array($clientConfig) ? [
                'projectId' => $clientConfig['projectId'] ?? null,
                'authDomain' => $clientConfig['authDomain'] ?? null,
                'storageBucket' => $clientConfig['storageBucket'] ?? null,
                'apiKey' => isset($clientConfig['apiKey']) ? '••••••• (hidden)' : null,
            ] : null,
            'collection_prefix' => $project->getFirebaseCollectionPrefix(),
        ];

        try {
            $firestoreContext = $this->firestore->contextFor($project);
            $payload['database'] = $firestoreContext['source'] === 'project'
                ? "this customer's own Firebase project"
                : 'the shared platform Firebase, namespaced to this project';
            $payload['firebase_project_id'] = $firestoreContext['firebase_project_id'];

            if ($arguments['test'] ?? true) {
                $collections = $this->firestore->listCollections($firestoreContext);
                $payload['reachable'] = true;
                $payload['collections'] = $collections;
            }
        } catch (\Throwable $e) {
            $payload['reachable'] = false;
            $payload['reachability_error'] = $e->getMessage();
        }

        return $payload;
    }
}
