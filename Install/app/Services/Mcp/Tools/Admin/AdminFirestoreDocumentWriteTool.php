<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\Firestore\FirestoreDataService;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\Concerns\UsesFirestore;
use App\Services\Mcp\McpTool;

/**
 * Create, update or delete a document in a customer site's Firestore
 * database.
 *
 * "update" patches by default — Firestore's PATCH replaces the entire
 * document unless an update mask is sent, which is a very easy way to
 * delete a customer's data while believing you changed one field. Passing
 * merge=false is the explicit way to ask for a replacement, and delete
 * needs confirm=true.
 */
class AdminFirestoreDocumentWriteTool extends McpTool
{
    use ResolvesAdminTargets, UsesFirestore;

    public function __construct(private readonly FirestoreDataService $firestore) {}

    public function name(): string
    {
        return 'admin_firestore_document_write';
    }

    public function description(): string
    {
        return "Create, update or delete a document in a customer site's Firestore database. "
            .'update merges the given fields by default (merge=false replaces the whole document); delete requires confirm=true. '
            .'Pass "data" as plain JSON — types are converted automatically.';
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
                'action' => ['type' => 'string', 'enum' => ['create', 'update', 'delete']],
                'collection' => ['type' => 'string', 'description' => 'Collection to create the document in (action=create).'],
                'document_id' => ['type' => 'string', 'description' => 'Id for the new document. Omit to let Firestore generate one.'],
                'path' => ['type' => 'string', 'description' => 'Document path for update/delete, e.g. "orders/abc123".'],
                'data' => ['type' => 'object', 'description' => 'Field map as plain JSON. Nested objects and arrays are supported.'],
                'merge' => ['type' => 'boolean', 'default' => true, 'description' => 'update only: merge the given fields instead of replacing the document.'],
                'confirm' => ['type' => 'boolean', 'default' => false, 'description' => 'Required for delete.'],
            ],
            'required' => ['project_id', 'action'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $action = (string) ($arguments['action'] ?? '');

        if (! in_array($action, ['create', 'update', 'delete'], true)) {
            return ['success' => false, 'message' => '"action" must be one of: create, update, delete.'];
        }

        if ($action === 'delete' && ! ($arguments['confirm'] ?? false)) {
            return ['success' => false, 'message' => 'Deleting a document is permanent. Re-send with confirm=true.'];
        }

        $data = is_array($arguments['data'] ?? null) ? $arguments['data'] : [];

        if ($action !== 'delete' && $data === []) {
            return ['success' => false, 'message' => '"data" is required for create and update.'];
        }

        try {
            $project = $this->resolveProject($arguments);
            $firestoreContext = $this->firestore->contextFor($project);

            $result = match ($action) {
                'create' => ['document' => $this->firestore->createDocument(
                    $firestoreContext,
                    $this->required($arguments, 'collection', 'create'),
                    isset($arguments['document_id']) ? (string) $arguments['document_id'] : null,
                    $data,
                )],
                'update' => ['document' => $this->firestore->updateDocument(
                    $firestoreContext,
                    $this->required($arguments, 'path', 'update'),
                    $data,
                    (bool) ($arguments['merge'] ?? true),
                )],
                'delete' => $this->firestore->deleteDocument($firestoreContext, $this->required($arguments, 'path', 'delete')),
            };
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return ['success' => true, 'action' => $action]
            + $result
            + $this->firestoreContextSummary($project, $firestoreContext);
    }

    private function required(array $arguments, string $key, string $action): string
    {
        $value = trim((string) ($arguments[$key] ?? ''));

        if ($value === '') {
            throw new \RuntimeException("\"{$key}\" is required for action={$action}.");
        }

        return $value;
    }
}
