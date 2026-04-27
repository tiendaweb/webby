<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class AppPreviewController extends Controller
{
    /**
     * Serve clean preview files (no inspector script).
     * Access controlled by project visibility settings.
     */
    public function serve(Request $request, Project $project, string $path = 'index.html'): Response
    {
        // Check visibility-based access
        if (! $this->canAccess($project)) {
            abort(404); // Return 404 to not leak project existence
        }

        // Clean and validate the path
        $path = ltrim($path, '/');
        if (empty($path)) {
            $path = 'index.html';
        }

        // Prevent directory traversal
        if (str_contains($path, '..')) {
            abort(403, 'Invalid path');
        }

        $previewPath = "previews/{$project->id}/{$path}";
        $fullPath = Storage::disk('local')->path($previewPath);

        // Check if the file exists (not directory)
        if (! is_file($fullPath)) {
            // Try index.html for directory requests
            if (! str_contains($path, '.')) {
                $indexPath = "previews/{$project->id}/{$path}/index.html";
                $indexFullPath = Storage::disk('local')->path($indexPath);
                if (is_file($indexFullPath)) {
                    $fullPath = $indexFullPath;
                    $path = rtrim($path, '/').'/index.html';
                } else {
                    // SPA fallback: serve root index.html for client-side routing
                    // This allows React Router to handle routes like /login, /signup, etc.
                    $spaFallbackPath = "previews/{$project->id}/index.html";
                    $spaFallbackFullPath = Storage::disk('local')->path($spaFallbackPath);
                    if (is_file($spaFallbackFullPath)) {
                        $fullPath = $spaFallbackFullPath;
                        $path = 'index.html';
                    } else {
                        abort(404);
                    }
                }
            } else {
                abort(404);
            }
        }

        $mimeType = $this->getMimeType($path);

        // For HTML files, update the base tag to use /app/ instead of /preview/
        if (str_ends_with($path, '.html') || str_ends_with($path, '.htm')) {
            $html = file_get_contents($fullPath);
            $html = preg_replace(
                '/<base href="\/preview\/([^"]+)"/',
                '<base href="/app/$1"',
                $html
            );

            return response($html, 200, [
                'Content-Type' => $mimeType,
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ]);
        }

        return response()->file($fullPath, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    /**
     * Check if the current user can access this project.
     */
    protected function canAccess(Project $project): bool
    {
        // If published with public visibility, anyone can access
        if ($project->published_visibility === 'public') {
            return true;
        }

        // For private visibility OR unpublished projects, only owner can access
        return Auth::check() && Auth::id() === $project->user_id;
    }

    /**
     * Get MIME type based on file extension.
     */
    protected function getMimeType(string $path): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        $mimeTypes = [
            'html' => 'text/html',
            'htm' => 'text/html',
            'css' => 'text/css',
            'js' => 'application/javascript',
            'mjs' => 'application/javascript',
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
            'map' => 'application/json',
        ];

        return $mimeTypes[$extension] ?? 'application/octet-stream';
    }
}
