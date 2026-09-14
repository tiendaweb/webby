<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Firestore\FirestoreDataService;
use App\Services\Mcp\Concerns\UsesFirestore;
use App\Services\Mcp\McpTool;

class ProjectFirestoreDocumentsListTool extends McpTool
{
    use UsesFirestore;

    public function __construct(private readonly FirestoreDataService $firestore) {}

    public function name(): string
    {
        return 'project_firestore_documents_list';
    }

    public function description(): string
    {
        return "Read documents from a collection in this site's Firestore database. "
            .'Without "where" it pages through everything; with "where" it runs a filtered query. Values come back as plain JSON.';
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
                'collection' => ['type' => 'string', 'description' => 'Collection path, e.g. "orders" or "shops/main/products".'],
            ] + $this->firestoreFilterSchema(),
            'required' => ['collection'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $collection = trim((string) ($arguments['collection'] ?? ''));

        if ($collection === '') {
            return ['success' => false, 'message' => '"collection" is required.'];
        }

        $project = $context['project'];

        try {
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
