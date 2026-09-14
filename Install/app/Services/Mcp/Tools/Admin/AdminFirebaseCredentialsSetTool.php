<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\FirebaseAdminService;
use App\Services\FirebaseService;
use App\Services\Firestore\FirestoreDataService;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;

/**
 * Give a customer site its own Firebase — or hand it back to the shared
 * platform one.
 *
 * This is what makes "each client has their own database" real rather than
 * a namespace: once a project carries its own service account, every
 * Firestore tool targets that customer's Firebase project directly, with no
 * prefix and no neighbours.
 *
 * Both credentials are stored encrypted (the Project model casts them), and
 * the service account is verified against the live API before it is saved —
 * storing one that does not work would leave the site pointing at a
 * database nobody can reach.
 */
class AdminFirebaseCredentialsSetTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(
        private readonly FirestoreDataService $firestore,
        private readonly FirebaseAdminService $firebaseAdmin,
        private readonly FirebaseService $firebase,
    ) {}

    public function name(): string
    {
        return 'admin_firebase_credentials_set';
    }

    public function description(): string
    {
        return 'Attach a Firebase project to one customer site: the admin service account JSON (server-side database access) '
            .'and/or the client SDK config (used by the generated site). Set use_system=true to drop back to the shared platform Firebase. '
            .'Service account credentials are verified against Firestore before being saved.';
    }

    public function requiredAbility(): ?string
    {
        return 'firestore:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.'],
                'service_account' => [
                    'type' => 'object',
                    'description' => 'The service account JSON from the Firebase console (project_id, client_email, private_key, …). Pass null to remove it.',
                ],
                'client_config' => [
                    'type' => 'object',
                    'description' => 'Web app config: apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId.',
                ],
                'use_system' => ['type' => 'boolean', 'description' => 'true = use the shared platform Firebase; false = use this project\'s own config.'],
                'skip_verification' => ['type' => 'boolean', 'default' => false, 'description' => 'Save the service account without checking it against Firestore first.'],
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

        $changes = [];
        $updates = [];

        if (array_key_exists('service_account', $arguments)) {
            $serviceAccount = $arguments['service_account'];

            if ($serviceAccount === null) {
                $updates['firebase_admin_service_account'] = null;
                $changes[] = 'service account removed';
            } elseif (is_array($serviceAccount)) {
                $validation = $this->firebaseAdmin->validateServiceAccount($serviceAccount);

                if (! $validation['valid']) {
                    return ['success' => false, 'message' => 'Invalid service account: '.implode(' ', $validation['errors'])];
                }

                if (! ($arguments['skip_verification'] ?? false)) {
                    try {
                        $this->firestore->listCollections([
                            'credentials' => $serviceAccount,
                            'firebase_project_id' => (string) $serviceAccount['project_id'],
                            'prefix' => '',
                            'source' => 'project',
                        ]);
                    } catch (\Throwable $e) {
                        return [
                            'success' => false,
                            'message' => 'These credentials did not work against Firestore: '.$e->getMessage()
                                .' Pass skip_verification=true to save them anyway.',
                        ];
                    }
                }

                $updates['firebase_admin_service_account'] = $serviceAccount;
                $changes[] = "service account set for Firebase project {$serviceAccount['project_id']}";
            } else {
                return ['success' => false, 'message' => '"service_account" must be an object or null.'];
            }
        }

        if (array_key_exists('client_config', $arguments)) {
            $clientConfig = $arguments['client_config'];

            if ($clientConfig === null) {
                $updates['firebase_config'] = null;
                $changes[] = 'client config removed';
            } elseif (is_array($clientConfig)) {
                $validation = $this->firebase->validateConfig($clientConfig);

                if (! $validation['valid']) {
                    return ['success' => false, 'message' => 'Invalid client config: '.implode(' ', $validation['errors'])];
                }

                $updates['firebase_config'] = $clientConfig;
                $changes[] = 'client config set';
            } else {
                return ['success' => false, 'message' => '"client_config" must be an object or null.'];
            }
        }

        if (array_key_exists('use_system', $arguments)) {
            $updates['uses_system_firebase'] = (bool) $arguments['use_system'];
            $changes[] = $arguments['use_system'] ? 'switched to the platform Firebase' : 'switched to its own Firebase';
        }

        if ($updates === []) {
            return ['success' => false, 'message' => 'Nothing to change: pass service_account, client_config or use_system.'];
        }

        $project->forceFill($updates)->save();
        $project->refresh();

        $summary = ['success' => true, 'project_id' => $project->id, 'changes' => $changes];

        try {
            $firestoreContext = $this->firestore->contextFor($project);
            $summary['database'] = $firestoreContext['source'] === 'project'
                ? "this customer's own Firebase project"
                : 'the shared platform Firebase, namespaced to this project';
            $summary['firebase_project_id'] = $firestoreContext['firebase_project_id'];
            $summary['path_prefix'] = $firestoreContext['prefix'] !== '' ? $firestoreContext['prefix'] : null;
        } catch (\Throwable $e) {
            $summary['warning'] = $e->getMessage();
        }

        return $summary;
    }
}
