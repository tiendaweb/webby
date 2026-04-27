<?php

namespace App\Services;

use App\Models\Project;
use Illuminate\Support\Facades\Http;

class FirebaseService
{
    /**
     * Get effective Firebase config for a project.
     */
    public function getConfig(Project $project): ?array
    {
        return $project->getFirebaseConfig();
    }

    /**
     * Get system Firebase config.
     */
    public function getSystemConfig(): array
    {
        return [
            'apiKey' => config('services.firebase.system_api_key'),
            'authDomain' => config('services.firebase.system_auth_domain'),
            'projectId' => config('services.firebase.system_project_id'),
            'storageBucket' => config('services.firebase.system_storage_bucket'),
            'messagingSenderId' => config('services.firebase.system_messaging_sender_id'),
            'appId' => config('services.firebase.system_app_id'),
        ];
    }

    /**
     * Validate a Firebase config.
     *
     * @return array{valid: bool, errors: array<string>}
     */
    public function validateConfig(array $config): array
    {
        $errors = [];
        $requiredFields = [
            'apiKey' => 'API Key',
            'authDomain' => 'Auth Domain',
            'projectId' => 'Project ID',
            'storageBucket' => 'Storage Bucket',
            'messagingSenderId' => 'Messaging Sender ID',
            'appId' => 'App ID',
        ];

        foreach ($requiredFields as $field => $label) {
            if (empty($config[$field])) {
                $errors[] = "{$label} is required.";
            }
        }

        // Validate format of auth domain
        if (! empty($config['authDomain']) && ! str_ends_with($config['authDomain'], '.firebaseapp.com')) {
            $errors[] = 'Auth Domain should end with .firebaseapp.com';
        }

        // Validate format of storage bucket
        if (! empty($config['storageBucket']) && ! str_ends_with($config['storageBucket'], '.appspot.com')) {
            $errors[] = 'Storage Bucket should end with .appspot.com';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Get the collection path for a project.
     */
    public function getCollectionPath(Project $project, string $collection): string
    {
        return $project->getFirebaseCollectionPath($collection);
    }

    /**
     * Generate Firestore security rules for a project.
     */
    public function generateSecurityRules(Project $project): string
    {
        $projectId = $project->id;
        $prefix = $project->getFirebaseCollectionPrefix();

        return <<<RULES
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Project-specific rules for project: {$projectId}
    match /{$prefix}/{collection}/{document=**} {
      // Allow read access to public documents
      allow read: if resource.data.visibility == 'public';

      // Allow read/write access to authenticated users
      allow read, write: if request.auth != null;
    }
  }
}
RULES;
    }

    /**
     * Test connection to Firebase.
     */
    public function testConnection(array $config): array
    {
        try {
            // Test by making a request to Firebase REST API
            $projectId = $config['projectId'] ?? '';
            $apiKey = $config['apiKey'] ?? '';

            if (empty($projectId) || empty($apiKey)) {
                return [
                    'success' => false,
                    'error' => 'Missing projectId or apiKey',
                ];
            }

            // Try to read a test document (works with API key + permissive security rules)
            $url = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents/_test_connection_/ping?key={$apiKey}";

            $response = Http::timeout(10)->get($url);

            // A 404 with "NOT_FOUND" means the API is working, just no document exists
            if ($response->status() === 404) {
                $body = $response->json();
                if (isset($body['error']['status']) && $body['error']['status'] === 'NOT_FOUND') {
                    return [
                        'success' => true,
                        'message' => 'Successfully connected to Firebase',
                    ];
                }
            }

            if ($response->successful()) {
                return [
                    'success' => true,
                    'message' => 'Successfully connected to Firebase',
                ];
            }

            // Handle specific HTTP status codes
            if ($response->status() === 404) {
                return [
                    'success' => false,
                    'error' => 'Firestore database not found. Please create a Firestore database in Firebase Console first.',
                ];
            }

            if ($response->status() === 403) {
                $body = $response->json();
                // PERMISSION_DENIED means credentials are valid but security rules deny access
                // This is expected with default Firestore rules and proves the connection works
                if (isset($body['error']['status']) && $body['error']['status'] === 'PERMISSION_DENIED') {
                    return [
                        'success' => true,
                        'message' => 'Successfully connected to Firebase (security rules are active)',
                    ];
                }

                return [
                    'success' => false,
                    'error' => 'Access denied. Check your API key and Firestore security rules.',
                ];
            }

            // Try to extract error from various response formats
            $body = $response->json();
            $error = $body['error']['message']
                ?? $body['error']['status']
                ?? $body['message']
                ?? 'Connection failed (HTTP '.$response->status().')';

            return [
                'success' => false,
                'error' => $error,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Check if system Firebase is configured.
     */
    public function isSystemConfigured(): bool
    {
        $config = $this->getSystemConfig();

        return ! empty($config['apiKey'])
            && ! empty($config['projectId'])
            && ! empty($config['authDomain']);
    }
}
