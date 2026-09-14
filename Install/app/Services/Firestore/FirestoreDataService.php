<?php

namespace App\Services\Firestore;

use App\Models\Project;
use App\Services\FirebaseAdminService;
use Google\Auth\Credentials\ServiceAccountCredentials;
use Google\Auth\HttpHandler\HttpHandlerFactory;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Read/write access to the Firestore database behind one Webby project.
 *
 * There are two arrangements and this class hides the difference:
 *
 * - **The customer's own Firebase.** The project carries its own service
 *   account (Project::firebase_admin_service_account). Paths are used as
 *   given — the whole Firestore instance belongs to that customer.
 * - **The platform's shared Firebase.** No per-project credentials, so the
 *   installation's service account is used and every path is forced under
 *   `projects/{projectId}/`, the same prefix Project::getFirebaseCollectionPrefix()
 *   and the generated security rules already use.
 *
 * That prefix is the entire tenant boundary in the shared arrangement, so
 * it is applied here, on every single call, rather than being left to each
 * caller to remember. scopePath() is the only way a path is built.
 *
 * Everything goes over the Firestore REST API rather than the gRPC client:
 * the installation already talks to Firestore this way (see
 * FirebaseAdminService), and it avoids requiring the gRPC PHP extension.
 *
 * @see https://firebase.google.com/docs/firestore/reference/rest
 */
class FirestoreDataService
{
    private const BASE = 'https://firestore.googleapis.com/v1';

    /** Access tokens are good for an hour; refresh a little early. */
    private const TOKEN_TTL_SECONDS = 3000;

    public function __construct(private readonly FirebaseAdminService $firebaseAdmin) {}

    /**
     * Work out which credentials serve this project and whether its paths
     * have to be namespaced.
     *
     * @return array{credentials: array, firebase_project_id: string, prefix: string, source: string}
     */
    public function contextFor(Project $project): array
    {
        $own = $project->firebase_admin_service_account;

        if (is_array($own) && ! empty($own['project_id']) && ! empty($own['private_key'])) {
            return [
                'credentials' => $own,
                'firebase_project_id' => (string) $own['project_id'],
                'prefix' => '',
                'source' => 'project',
            ];
        }

        $platform = $this->firebaseAdmin->getServiceAccount();

        if (! is_array($platform) || empty($platform['project_id'])) {
            throw new RuntimeException(
                'This project has no Firebase service account of its own, and the platform has none configured either. '
                .'Set one with admin_firebase_credentials_set, or configure the platform Firebase in the admin settings.'
            );
        }

        return [
            'credentials' => $platform,
            'firebase_project_id' => (string) $platform['project_id'],
            // Shared instance: this is the tenant boundary.
            'prefix' => $project->getFirebaseCollectionPrefix(),
            'source' => 'platform',
        ];
    }

    // ---------------------------------------------------------------
    // Reads
    // ---------------------------------------------------------------

    /**
     * Collection ids directly under $parentPath (empty = the project root).
     *
     * @return string[]
     */
    public function listCollections(array $context, string $parentPath = ''): array
    {
        $parent = $this->documentsRoot($context).$this->scopePath($context, $parentPath, allowEmpty: true);

        $response = $this->request($context, 'post', "{$parent}:listCollectionIds", ['pageSize' => 300]);

        return array_values((array) ($response['collectionIds'] ?? []));
    }

    /**
     * @return array{documents: array, next_page_token: ?string}
     */
    public function listDocuments(array $context, string $collection, int $limit = 25, ?string $pageToken = null): array
    {
        $path = $this->documentsRoot($context).$this->scopePath($context, $collection);
        $query = ['pageSize' => max(1, min($limit, 300))];

        if ($pageToken) {
            $query['pageToken'] = $pageToken;
        }

        $response = $this->request($context, 'get', $path, $query);

        return [
            'documents' => array_map(
                fn (array $doc) => $this->presentDocument($context, $doc),
                (array) ($response['documents'] ?? [])
            ),
            'next_page_token' => $response['nextPageToken'] ?? null,
        ];
    }

    public function getDocument(array $context, string $documentPath): array
    {
        $path = $this->documentsRoot($context).$this->scopePath($context, $documentPath);

        return $this->presentDocument($context, $this->request($context, 'get', $path));
    }

    /**
     * Filtered read. Firestore's runQuery takes the *parent* of the
     * collection plus the collection id, which is why the path is split
     * here rather than passed whole.
     *
     * @param  array<int, array{field: string, op: string, value: mixed}>  $where
     */
    public function query(
        array $context,
        string $collection,
        array $where = [],
        ?string $orderBy = null,
        string $direction = 'ASCENDING',
        int $limit = 25,
    ): array {
        $scoped = ltrim($this->scopePath($context, $collection), '/');
        $segments = explode('/', $scoped);
        $collectionId = array_pop($segments);
        $parentSuffix = $segments === [] ? '' : '/'.implode('/', $segments);

        $structured = [
            'from' => [['collectionId' => $collectionId]],
            'limit' => max(1, min($limit, 300)),
        ];

        $filters = [];

        foreach ($where as $condition) {
            $field = (string) ($condition['field'] ?? '');

            if ($field === '') {
                continue;
            }

            $filters[] = [
                'fieldFilter' => [
                    'field' => ['fieldPath' => $field],
                    'op' => $this->operator((string) ($condition['op'] ?? '==')),
                    'value' => self::toFirestoreValue($condition['value'] ?? null),
                ],
            ];
        }

        if (count($filters) === 1) {
            $structured['where'] = $filters[0];
        } elseif (count($filters) > 1) {
            $structured['where'] = ['compositeFilter' => ['op' => 'AND', 'filters' => $filters]];
        }

        if ($orderBy) {
            $structured['orderBy'] = [[
                'field' => ['fieldPath' => $orderBy],
                'direction' => strtoupper($direction) === 'DESCENDING' ? 'DESCENDING' : 'ASCENDING',
            ]];
        }

        $parent = $this->documentsRoot($context).$parentSuffix;
        $response = $this->request($context, 'post', "{$parent}:runQuery", ['structuredQuery' => $structured]);

        $documents = [];

        foreach ((array) $response as $row) {
            if (isset($row['document'])) {
                $documents[] = $this->presentDocument($context, $row['document']);
            }
        }

        return ['documents' => $documents, 'count' => count($documents)];
    }

    // ---------------------------------------------------------------
    // Writes
    // ---------------------------------------------------------------

    public function createDocument(array $context, string $collection, ?string $documentId, array $data): array
    {
        $path = $this->documentsRoot($context).$this->scopePath($context, $collection);
        $query = [];

        if (is_string($documentId) && $documentId !== '') {
            $query['documentId'] = $documentId;
        }

        $response = $this->request($context, 'post', $path, ['fields' => self::toFirestoreFields($data)], $query);

        return $this->presentDocument($context, $response);
    }

    /**
     * @param  bool  $merge  true patches only the given fields; false replaces the document
     */
    public function updateDocument(array $context, string $documentPath, array $data, bool $merge = true): array
    {
        $path = $this->documentsRoot($context).$this->scopePath($context, $documentPath);
        $query = [];

        if ($merge) {
            // Without an explicit updateMask Firestore replaces the whole
            // document, silently dropping every field not sent.
            foreach (array_keys($data) as $field) {
                $query['updateMask.fieldPaths'][] = $field;
            }
        }

        $response = $this->request($context, 'patch', $path, ['fields' => self::toFirestoreFields($data)], $query);

        return $this->presentDocument($context, $response);
    }

    public function deleteDocument(array $context, string $documentPath): array
    {
        $path = $this->documentsRoot($context).$this->scopePath($context, $documentPath);
        $this->request($context, 'delete', $path);

        return ['deleted' => true, 'path' => ltrim($this->scopePath($context, $documentPath), '/')];
    }

    // ---------------------------------------------------------------
    // Paths
    // ---------------------------------------------------------------

    private function documentsRoot(array $context): string
    {
        return "projects/{$context['firebase_project_id']}/databases/(default)/documents";
    }

    /**
     * Normalise a caller-supplied path and, on the shared instance, force
     * it under this project's prefix. Everything that builds a Firestore
     * URL goes through here — that is what makes the tenant boundary hold.
     */
    private function scopePath(array $context, string $path, bool $allowEmpty = false): string
    {
        $clean = trim(str_replace('\\', '/', $path), '/');
        $clean = preg_replace('#/+#', '/', $clean) ?? '';

        if ($clean === '' && ! $allowEmpty) {
            throw new RuntimeException('A collection or document path is required.');
        }

        foreach (explode('/', $clean) as $segment) {
            if ($segment === '.' || $segment === '..') {
                throw new RuntimeException("Invalid path segment in \"{$path}\".");
            }
        }

        $prefix = (string) $context['prefix'];

        if ($prefix === '') {
            return $clean === '' ? '' : '/'.$clean;
        }

        // Tolerate a caller that already spelled the prefix out, so the
        // paths returned by a read can be fed straight back into a write.
        if ($clean === $prefix || str_starts_with($clean, $prefix.'/')) {
            return '/'.$clean;
        }

        return $clean === '' ? '/'.$prefix : '/'.$prefix.'/'.$clean;
    }

    /**
     * Turn a REST document into something a model can read: a relative
     * path, plain-PHP fields, and the timestamps.
     */
    private function presentDocument(array $context, array $document): array
    {
        $name = (string) ($document['name'] ?? '');
        $root = $this->documentsRoot($context).'/';
        $relative = str_starts_with($name, $root) ? substr($name, strlen($root)) : $name;

        $prefix = (string) $context['prefix'];
        $short = $prefix !== '' && str_starts_with($relative, $prefix.'/')
            ? substr($relative, strlen($prefix) + 1)
            : $relative;

        return [
            'path' => $short,
            'full_path' => $relative,
            'id' => basename($relative),
            'data' => self::fromFirestoreFields((array) ($document['fields'] ?? [])),
            'created_at' => $document['createTime'] ?? null,
            'updated_at' => $document['updateTime'] ?? null,
        ];
    }

    private function operator(string $op): string
    {
        return match (strtolower(trim($op))) {
            '<', 'lt' => 'LESS_THAN',
            '<=', 'lte' => 'LESS_THAN_OR_EQUAL',
            '>', 'gt' => 'GREATER_THAN',
            '>=', 'gte' => 'GREATER_THAN_OR_EQUAL',
            '!=', 'ne' => 'NOT_EQUAL',
            'in' => 'IN',
            'not-in', 'not_in' => 'NOT_IN',
            'array-contains', 'array_contains' => 'ARRAY_CONTAINS',
            'array-contains-any', 'array_contains_any' => 'ARRAY_CONTAINS_ANY',
            default => 'EQUAL',
        };
    }

    // ---------------------------------------------------------------
    // Value conversion
    // ---------------------------------------------------------------

    /** Firestore's own value wrappers, recognised so they can pass through untouched. */
    private const VALUE_KEYS = [
        'nullValue', 'booleanValue', 'integerValue', 'doubleValue', 'timestampValue',
        'stringValue', 'bytesValue', 'referenceValue', 'geoPointValue', 'arrayValue', 'mapValue',
    ];

    public static function toFirestoreFields(array $data): array
    {
        $fields = [];

        foreach ($data as $key => $value) {
            $fields[(string) $key] = self::toFirestoreValue($value);
        }

        return $fields;
    }

    /**
     * Plain JSON in, Firestore Value out. An already-wrapped value (e.g.
     * {"timestampValue": "2026-01-01T00:00:00Z"}) is passed through, which
     * is the escape hatch for the types plain JSON cannot express.
     */
    public static function toFirestoreValue(mixed $value): array
    {
        if ($value === null) {
            return ['nullValue' => null];
        }

        if (is_bool($value)) {
            return ['booleanValue' => $value];
        }

        if (is_int($value)) {
            return ['integerValue' => (string) $value];
        }

        if (is_float($value)) {
            return ['doubleValue' => $value];
        }

        if (is_string($value)) {
            return ['stringValue' => $value];
        }

        if (is_array($value)) {
            if (count($value) === 1 && in_array(array_key_first($value), self::VALUE_KEYS, true)) {
                return $value;
            }

            if (array_is_list($value)) {
                return ['arrayValue' => ['values' => array_map(fn ($item) => self::toFirestoreValue($item), $value)]];
            }

            return ['mapValue' => ['fields' => self::toFirestoreFields($value)]];
        }

        return ['stringValue' => (string) $value];
    }

    public static function fromFirestoreFields(array $fields): array
    {
        $data = [];

        foreach ($fields as $key => $value) {
            $data[$key] = self::fromFirestoreValue((array) $value);
        }

        return $data;
    }

    public static function fromFirestoreValue(array $value): mixed
    {
        if (array_key_exists('nullValue', $value)) {
            return null;
        }

        if (array_key_exists('booleanValue', $value)) {
            return (bool) $value['booleanValue'];
        }

        if (array_key_exists('integerValue', $value)) {
            return (int) $value['integerValue'];
        }

        if (array_key_exists('doubleValue', $value)) {
            return (float) $value['doubleValue'];
        }

        if (array_key_exists('arrayValue', $value)) {
            return array_map(
                fn ($item) => self::fromFirestoreValue((array) $item),
                (array) ($value['arrayValue']['values'] ?? [])
            );
        }

        if (array_key_exists('mapValue', $value)) {
            return self::fromFirestoreFields((array) ($value['mapValue']['fields'] ?? []));
        }

        foreach (['stringValue', 'timestampValue', 'bytesValue', 'referenceValue'] as $key) {
            if (array_key_exists($key, $value)) {
                return $value[$key];
            }
        }

        if (array_key_exists('geoPointValue', $value)) {
            return $value['geoPointValue'];
        }

        return null;
    }

    // ---------------------------------------------------------------
    // Transport
    // ---------------------------------------------------------------

    private function request(array $context, string $method, string $path, array $body = [], array $query = []): array
    {
        $url = self::BASE.'/'.ltrim($path, '/');
        $request = Http::withToken($this->accessToken($context['credentials']))->timeout(30);

        $response = match ($method) {
            'get' => $request->get($url, $query),
            'delete' => $request->delete($url, $query),
            'patch' => $request->patch($url.$this->queryString($query), $body),
            default => $request->post($url.$this->queryString($query), $body),
        };

        if (! $response->successful()) {
            $message = $response->json('error.message') ?? $response->body();

            throw new RuntimeException("Firestore: {$message}");
        }

        $decoded = $response->json();

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Built by hand because updateMask.fieldPaths repeats the same key, and
     * http_build_query would turn that into fieldPaths[0]=…, which the API
     * ignores — silently replacing the whole document instead of patching.
     */
    private function queryString(array $query): string
    {
        if ($query === []) {
            return '';
        }

        $pairs = [];

        foreach ($query as $key => $value) {
            foreach ((array) $value as $item) {
                $pairs[] = rawurlencode((string) $key).'='.rawurlencode((string) $item);
            }
        }

        return '?'.implode('&', $pairs);
    }

    private function accessToken(array $credentials): string
    {
        $cacheKey = 'firestore-token:'.sha1((string) ($credentials['client_email'] ?? '').($credentials['project_id'] ?? ''));

        return Cache::remember($cacheKey, self::TOKEN_TTL_SECONDS, function () use ($credentials) {
            $creds = new ServiceAccountCredentials(['https://www.googleapis.com/auth/datastore'], $credentials);
            $token = $creds->fetchAuthToken(HttpHandlerFactory::build());

            if (empty($token['access_token'])) {
                throw new RuntimeException('Could not obtain a Firestore access token from these service account credentials.');
            }

            return $token['access_token'];
        });
    }
}
