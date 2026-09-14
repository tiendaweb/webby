<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Firestore\FirestoreDataService;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\Concerns\UsesFirestore;
use App\Services\Mcp\McpTool;

/**
 * Entry point for a customer site's own database: what collections exist,
 * and which Firebase they actually live in.
 */
class AdminFirestoreCollectionsListTool extends McpTool
{
    use ResolvesAdminTargets, UsesFirestore;

    public function __construct(private readonly FirestoreDataService $firestore) {}

    public function name(): string
    {
        return 'admin_firestore_collections_list';
    }

    public function description(): string
    {
        return "List the Firestore collections of one customer site's database. "
            .'Uses that project\'s own Firebase service account when it has one, otherwise the platform Firebase namespaced to the project. '
            .'Start here before reading or writing documents.';
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
                'parent_path' => ['type' => 'string', 'description' => 'List sub-collections of this document instead of the root, e.g. "orders/abc123".'],
            ],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $project = $this->resolveProject($arguments);
            $firestoreContext = $this->firestore->contextFor($project);
            $collections = $this->firestore->listCollections($firestoreContext, (string) ($arguments['parent_path'] ?? ''));
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return [
            'success' => true,
            'collections' => $collections,
            'count' => count($collections),
        ] + $this->firestoreContextSummary($project, $firestoreContext);
    }
}
