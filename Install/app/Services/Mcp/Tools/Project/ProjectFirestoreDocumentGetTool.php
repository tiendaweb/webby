<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Firestore\FirestoreDataService;
use App\Services\Mcp\Concerns\UsesFirestore;
use App\Services\Mcp\McpTool;

class ProjectFirestoreDocumentGetTool extends McpTool
{
    use UsesFirestore;

    public function __construct(private readonly FirestoreDataService $firestore) {}

    public function name(): string
    {
        return 'project_firestore_document_get';
    }

    public function description(): string
    {
        return "Read one document from this site's Firestore database by its path, e.g. \"orders/abc123\".";
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
                'path' => ['type' => 'string', 'description' => 'Document path: collection/documentId (an even number of segments).'],
            ],
            'required' => ['path'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];

        try {
            $firestoreContext = $this->firestore->contextFor($project);
            $document = $this->firestore->getDocument($firestoreContext, (string) ($arguments['path'] ?? ''));
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return ['success' => true, 'document' => $document]
            + $this->firestoreContextSummary($project, $firestoreContext);
    }
}
