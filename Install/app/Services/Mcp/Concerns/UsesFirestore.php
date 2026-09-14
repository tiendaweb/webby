<?php

namespace App\Services\Mcp\Concerns;

use App\Models\Project;
use App\Services\Firestore\FirestoreDataService;

/**
 * Shared plumbing for the Firestore tools on both MCP servers.
 *
 * The admin server reaches any project's database and the project server
 * only its own, but once the Project is resolved the two behave
 * identically — including the tenant note in every result, so a model can
 * see whether it is inside the customer's own Firebase or inside the
 * platform's shared one under a prefix.
 */
trait UsesFirestore
{
    /**
     * Reusable argument fragment: how to filter a document listing.
     */
    protected function firestoreFilterSchema(): array
    {
        return [
            'where' => [
                'type' => 'array',
                'description' => 'Filters combined with AND, e.g. [{"field":"status","op":"==","value":"paid"}]. '
                    .'Operators: ==, !=, <, <=, >, >=, in, not-in, array-contains, array-contains-any.',
                'items' => [
                    'type' => 'object',
                    'properties' => [
                        'field' => ['type' => 'string'],
                        'op' => ['type' => 'string', 'default' => '=='],
                        'value' => ['description' => 'Any JSON value.'],
                    ],
                    'required' => ['field', 'value'],
                ],
            ],
            'order_by' => ['type' => 'string', 'description' => 'Field to sort by. Only applies when "where" is used.'],
            'direction' => ['type' => 'string', 'enum' => ['ASCENDING', 'DESCENDING'], 'default' => 'ASCENDING'],
            'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 300, 'default' => 25],
            'page_token' => ['type' => 'string', 'description' => 'next_page_token from a previous unfiltered listing.'],
        ];
    }

    /**
     * The bit of every result that says which database was actually
     * touched. Worth repeating on each call: "the customer's own Firebase"
     * and "a namespaced corner of ours" are very different blast radii.
     */
    protected function firestoreContextSummary(Project $project, array $context): array
    {
        return [
            'project_id' => $project->id,
            'firebase_project_id' => $context['firebase_project_id'],
            'database' => $context['source'] === 'project'
                ? "this customer's own Firebase project"
                : 'the shared platform Firebase, namespaced to this project',
            'path_prefix' => $context['prefix'] !== '' ? $context['prefix'] : null,
        ];
    }

    /**
     * List or query, depending on whether filters were supplied. Firestore
     * paginates plain listings and does not paginate runQuery, so the two
     * return slightly different envelopes and callers need to know which
     * they got.
     */
    protected function firestoreRead(FirestoreDataService $firestore, array $context, string $collection, array $arguments): array
    {
        $where = is_array($arguments['where'] ?? null) ? $arguments['where'] : [];
        $limit = (int) ($arguments['limit'] ?? 25);

        if ($where !== [] || ! empty($arguments['order_by'])) {
            $result = $firestore->query(
                $context,
                $collection,
                $where,
                $arguments['order_by'] ?? null,
                (string) ($arguments['direction'] ?? 'ASCENDING'),
                $limit,
            );

            return ['filtered' => true] + $result;
        }

        $result = $firestore->listDocuments($context, $collection, $limit, $arguments['page_token'] ?? null);

        return [
            'filtered' => false,
            'documents' => $result['documents'],
            'count' => count($result['documents']),
            'next_page_token' => $result['next_page_token'],
        ];
    }
}
