<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\File;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DocumentationController extends Controller
{
    /**
     * MIME types for common static file extensions.
     */
    private array $mimeTypes = [
        'html' => 'text/html',
        'htm' => 'text/html',
        'css' => 'text/css',
        'js' => 'application/javascript',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'webp' => 'image/webp',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'eot' => 'application/vnd.ms-fontobject',
        'otf' => 'font/otf',
        'txt' => 'text/plain',
        'xml' => 'application/xml',
        'pdf' => 'application/pdf',
        'zip' => 'application/zip',
    ];

    /**
     * Blocked file extensions for security.
     */
    private array $blockedExtensions = [
        'php',
        'phtml',
        'php3',
        'php4',
        'php5',
        'php7',
        'phps',
        'phar',
        'htaccess',
        'htpasswd',
        'env',
        'sh',
        'bash',
        'pl',
        'py',
        'rb',
        'cgi',
    ];

    /**
     * Serve documentation files.
     *
     * @param  string|null  $path  The file path within the docs folder
     */
    public function show(?string $path = null): Response|BinaryFileResponse|RedirectResponse
    {
        // Redirect to home if demo mode is disabled
        if (! config('app.demo')) {
            return redirect('/');
        }

        // Redirect to trailing slash for root path to fix relative URL resolution
        if (empty($path)) {
            $rawUri = $_SERVER['REQUEST_URI'] ?? '';
            $uriPath = parse_url($rawUri, PHP_URL_PATH) ?? '';
            if ($uriPath === '/documentation') {
                $scheme = request()->getScheme();
                $host = request()->getHttpHost();

                return response('', 301)->header('Location', "{$scheme}://{$host}/documentation/");
            }
        }

        // Default to index.html if no path provided
        if (empty($path) || $path === '/') {
            $path = 'index.html';
        }

        // Security: Prevent directory traversal attacks
        if ($this->hasDirectoryTraversal($path)) {
            abort(404);
        }

        // Security: Block dangerous file extensions
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        if (in_array($extension, $this->blockedExtensions)) {
            abort(404);
        }

        // Build the full file path (serve from docs/dist for Vite build output)
        $filePath = base_path('docs/dist/'.ltrim($path, '/'));

        // Check if file exists and is a regular file (not directory)
        if (! File::exists($filePath) || ! is_file($filePath)) {
            abort(404);
        }

        // Ensure the resolved path is still within the docs directory (realpath check)
        $realPath = realpath($filePath);
        $docsPath = realpath(base_path('docs/dist'));

        if ($realPath === false || $docsPath === false || ! str_starts_with($realPath, $docsPath)) {
            abort(404);
        }

        // Get the MIME type
        $mimeType = $this->getMimeType($extension, $filePath);

        // Determine cache duration based on file type
        $cacheDuration = $this->getCacheDuration($extension);

        // Return the file with appropriate headers
        $response = response(File::get($filePath), 200)
            ->header('Content-Type', $mimeType);

        // Set cache headers
        $response->setCache([
            'public' => true,
            'max_age' => $cacheDuration,
        ]);

        return $response;
    }

    /**
     * Check if path contains directory traversal attempts.
     */
    private function hasDirectoryTraversal(string $path): bool
    {
        $decoded = urldecode($path);

        if (str_contains($decoded, '..')) {
            return true;
        }

        if (str_contains($decoded, "\0")) {
            return true;
        }

        return false;
    }

    /**
     * Get MIME type for a file extension.
     */
    private function getMimeType(string $extension, string $filePath): string
    {
        if (isset($this->mimeTypes[$extension])) {
            return $this->mimeTypes[$extension];
        }

        $mimeType = File::mimeType($filePath);

        return $mimeType ?: 'application/octet-stream';
    }

    /**
     * Get cache duration based on file type.
     */
    private function getCacheDuration(string $extension): int
    {
        $longCache = ['css', 'js', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'woff', 'woff2', 'ttf', 'eot', 'otf'];

        if (in_array($extension, $longCache)) {
            return 86400; // 1 day
        }

        return 3600; // 1 hour
    }
}
