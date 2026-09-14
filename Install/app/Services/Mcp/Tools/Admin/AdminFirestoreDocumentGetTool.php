<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Firestore\FirestoreDataService;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\Concerns\UsesFirestore;
use App\Services\Mcp\McpTool;

class AdminFirestoreDocumentGetTool extends McpTool
{
    use ResolvesAdminTargets, UsesFirestore;

    public function __construct(private readonly FirestoreDataService $firestore) {}

    public function name(): string
    {
        return 'admin_firestore_document_get';
    }

    public function description(): string
    {
        return "Read one document from a customer site's Firestore database by its path, e.g. \"orders/abc123\".";
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
                'path' => ['type' => 'string', 'description' => 'Document path: collection/documentId (an even number of segments).'],
            ],
            'required' => ['project_id', 'path'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $project = $this->resolveProject($arguments);
            $firestoreContext = $this->firestore->contextFor($project);
            $document = $this->firestore->getDocument($firestoreContext, (string) ($arguments['path'] ?? ''));
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return ['success' => true, 'document' => $document]
            + $this->firestoreContextSummary($project, $firestoreContext);
    }
}
