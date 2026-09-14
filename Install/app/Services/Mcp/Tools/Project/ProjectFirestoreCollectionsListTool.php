<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Firestore\FirestoreDataService;
use App\Services\Mcp\Concerns\UsesFirestore;
use App\Services\Mcp\McpTool;

/**
 * The customer-facing half of the Firestore tools: same capability as the
 * admin ones, but the project is the connection's own — it comes from the
 * validated token, never from an argument, so there is no way to name
 * somebody else's site.
 */
class ProjectFirestoreCollectionsListTool extends McpTool
{
    use UsesFirestore;

    public function __construct(private readonly FirestoreDataService $firestore) {}

    public function name(): string
    {
        return 'project_firestore_collections_list';
    }

    public function description(): string
    {
        return "List the Firestore collections of this site's database. Call this first to see what data the site has.";
    }

    public function requiredAbility(): ?string
    {
        return 'firebase:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'parent_path' => ['type' => 'string', 'description' => 'List sub-collections of this document instead of the root, e.g. "orders/abc123".'],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];

        try {
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
