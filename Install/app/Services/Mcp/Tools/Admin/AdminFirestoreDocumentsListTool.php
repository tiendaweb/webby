<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Firestore\FirestoreDataService;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\Concerns\UsesFirestore;
use App\Services\Mcp\McpTool;

/**
 * Read documents out of a customer's collection, either straight through
 * (paginated) or filtered with a query.
 */
class AdminFirestoreDocumentsListTool extends McpTool
{
    use ResolvesAdminTargets, UsesFirestore;

    public function __construct(private readonly FirestoreDataService $firestore) {}

    public function name(): string
    {
        return 'admin_firestore_documents_list';
    }

    public function description(): string
    {
        return "Read documents from a collection in a customer site's Firestore database. "
            .'Without "where" it pages through everything; with "where" it runs a filtered query. Values come back as plain JSON.';
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
                'collection' => ['type' => 'string', 'description' => 'Collection path, e.g. "orders" or "shops/main/products".'],
            ] + $this->firestoreFilterSchema(),
            'required' => ['project_id', 'collection'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $collection = trim((string) ($arguments['collection'] ?? ''));

        if ($collection === '') {
            return ['success' => false, 'message' => '"collection" is required.'];
        }

        try {
            $project = $this->resolveProject($arguments);
            $firestoreContext = $this->firestore->contextFor($project);
            $result = $this->firestoreRead($this->firestore, $firestoreContext, $collection, $arguments);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return ['success' => true, 'collection' => $collection]
            + $result
            + $this->firestoreContextSummary($project, $firestoreContext);
    }
}
