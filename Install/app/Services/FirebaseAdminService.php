<?php

namespace App\Services;

use App\Models\SystemSetting;
use Google\Auth\Credentials\ServiceAccountCredentials;
use Google\Auth\HttpHandler\HttpHandlerFactory;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class FirebaseAdminService
{
    private const SETTING_KEY = 'firebase_admin_service_account';

    private const SETTING_GROUP = 'integrations';

    /**
     * Get stored service account credentials.
     */
    public function getServiceAccount(): ?array
    {
        return SystemSetting::get(self::SETTING_KEY);
    }

    /**
     * Store service account credentials (encrypted).
     */
    public function setServiceAccount(array $credentials): void
    {
        SystemSetting::set(
            self::SETTING_KEY,
            $credentials,
            'encrypted_json',
            self::SETTING_GROUP
        );
    }

    /**
     * Remove stored service account.
     */
    public function removeServiceAccount(): void
    {
        SystemSetting::where('key', self::SETTING_KEY)->delete();
        Cache::forget('setting.'.self::SETTING_KEY);
    }

    /**
     * Get project info (project_id, client_email) without exposing private key.
     */
    public function getProjectInfo(): ?array
    {
        $sa = $this->getServiceAccount();
        if (! $sa) {
            return null;
        }

        return [
            'project_id' => $sa['project_id'] ?? null,
            'client_email' => $sa['client_email'] ?? null,
        ];
    }

    /**
     * Validate service account JSON structure.
     */
    public function validateServiceAccount(array $json): array
    {
        $errors = [];
        $required = ['project_id', 'private_key', 'client_email'];

        foreach ($required as $field) {
            if (empty($json[$field])) {
                $errors[] = "Missing required field: {$field}";
            }
        }

        if (! empty($json['type']) && $json['type'] !== 'service_account') {
            $errors[] = "Invalid type: expected 'service_account'";
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Test connection to Firestore using Admin SDK.
     */
    public function testConnection(): array
    {
        $sa = $this->getServiceAccount();
        if (! $sa) {
            return ['success' => false, 'error' => 'Service account not configured'];
        }

        try {
            // Test by listing root collections
            $this->listCollectionsViaRest($sa, '');

            return ['success' => true, 'message' => 'Connection successful'];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * List collections under a path prefix.
     */
    public function listCollections(string $prefix = ''): array
    {
        $sa = $this->getServiceAccount();
        if (! $sa) {
            throw new \Exception('Firebase Admin SDK not configured');
        }

        return $this->listCollectionsViaRest($sa, $prefix);
    }

    /**
     * Check if Admin SDK is configured.
     */
    public function isConfigured(): bool
    {
        return $this->getServiceAccount() !== null;
    }

    /**
     * Test connection with specific service account credentials.
     */
    public function testConnectionWithCredentials(array $credentials): array
    {
        try {
            // Test by listing root collections
            $this->listCollectionsViaRest($credentials, '');

            return ['success' => true, 'message' => 'Connection successful'];
        } catch (\Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * List collections using specific credentials.
     */
    public function listCollectionsWithCredentials(array $credentials, string $prefix = ''): array
    {
        return $this->listCollectionsViaRest($credentials, $prefix);
    }

    /**
     * Get project info from specific credentials (without exposing private key).
     */
    public function getProjectInfoFromCredentials(array $credentials): array
    {
        return [
            'project_id' => $credentials['project_id'] ?? null,
            'client_email' => $credentials['client_email'] ?? null,
        ];
    }

    /**
     * List collections via Firestore REST API (no gRPC required).
     */
    private function listCollectionsViaRest(array $credentials, string $prefix = ''): array
    {
        $projectId = $credentials['project_id'] ?? null;
        if (! $projectId) {
            throw new \Exception('Project ID not found in credentials');
        }

        $accessToken = $this->getAccessToken($credentials);

        // Build the parent path
        $parent = "projects/{$projectId}/databases/(default)/documents";
        if (! empty($prefix)) {
            $parent .= '/'.$prefix;
        }

        $url = "https://firestore.googleapis.com/v1/{$parent}:listCollectionIds";

        $response = Http::withToken($accessToken)
            ->post($url, ['pageSize' => 100]);

        if (! $response->successful()) {
            $error = $response->json('error.message') ?? $response->body();
            throw new \Exception("Firestore API error: {$error}");
        }

        $collectionIds = $response->json('collectionIds') ?? [];
        $collections = [];

        foreach ($collectionIds as $id) {
            $collections[] = [
                'id' => $id,
                'path' => empty($prefix) ? $id : $prefix.'/'.$id,
            ];
        }

        return $collections;
    }

    /**
     * List documents from a collection via Firestore REST API.
     * Returns array of documents with their fields.
     */
    private function listDocumentsViaRest(array $credentials, string $collectionPath, int $limit = 5): array
    {
        $projectId = $credentials['project_id'] ?? null;
        if (! $projectId) {
            throw new \Exception('Project ID not found in credentials');
        }

        $accessToken = $this->getAccessToken($credentials);

        $parent = "projects/{$projectId}/databases/(default)/documents/{$collectionPath}";
        $url = "https://firestore.googleapis.com/v1/{$parent}?pageSize={$limit}";

        $response = Http::withToken($accessToken)->get($url);

        if (! $response->successful()) {
            return []; // Empty if collection doesn't exist or no documents
        }

        return $response->json('documents') ?? [];
    }

    /**
     * Get collections with metadata (document count and sample fields).
     * Used by builder API for AI agent.
     */
    public function getCollectionsWithMetadata(array $credentials, string $prefix, int $maxDocs = 100): array
    {
        $collections = $this->listCollectionsViaRest($credentials, $prefix);
        $result = [];

        foreach ($collections as $collection) {
            $collectionPath = $collection['path'];

            // Get documents (capped at maxDocs)
            $docs = $this->listDocumentsViaRest($credentials, $collectionPath, min($maxDocs, 100));
            $docCount = count($docs);

            // Extract sample field names from first document
            $sampleFields = [];
            if (! empty($docs) && isset($docs[0]['fields'])) {
                $sampleFields = array_keys($docs[0]['fields']);
                $sampleFields = array_slice($sampleFields, 0, 20); // Limit to 20 fields
            }

            $result[] = [
                'name' => $collection['id'],
                'document_count' => $docCount >= $maxDocs ? "{$maxDocs}+" : $docCount,
                'sample_fields' => $sampleFields,
            ];
        }

        return $result;
    }

    /**
     * Get OAuth2 access token from service account credentials.
     */
    private function getAccessToken(array $credentials): string
    {
        $scopes = ['https://www.googleapis.com/auth/datastore'];

        $creds = new ServiceAccountCredentials($scopes, $credentials);
        $handler = HttpHandlerFactory::build();
        $token = $creds->fetchAuthToken($handler);

        if (empty($token['access_token'])) {
            throw new \Exception('Failed to obtain access token');
        }

        return $token['access_token'];
    }
}
