<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class PublishedProjectController extends Controller
{
    public function serve(Request $request, string $path = 'index.html'): Response
    {
        $project = $request->attributes->get('subdomain_project')
            ?? $request->attributes->get('custom_domain_project');

        if (! $project) {
            abort(404, 'Project not found');
        }

        $path = ltrim($path, '/') ?: 'index.html';

        if (str_contains($path, '..')) {
            abort(403, 'Invalid path');
        }

        // Strip /preview/{project_id}/ prefix from asset paths.
        // The in-app preview builds HTML with absolute paths like /preview/{id}/assets/...,
        // but when served via subdomain, these paths arrive here with the prefix intact.
        $previewPrefix = "preview/{$project->id}/";
        if (str_starts_with($path, $previewPrefix)) {
            $path = substr($path, strlen($previewPrefix)) ?: 'index.html';
        }

        $previewPath = "previews/{$project->id}/{$path}";

        if (! Storage::disk('local')->exists($previewPath)) {
            if (! str_contains($path, '.')) {
                $indexPath = "previews/{$project->id}/{$path}/index.html";
                if (Storage::disk('local')->exists($indexPath)) {
                    $previewPath = $indexPath;
                } else {
                    // SPA fallback: serve root index.html for client-side routing
                    $spaFallbackPath = "previews/{$project->id}/index.html";
                    if (Storage::disk('local')->exists($spaFallbackPath)) {
                        $previewPath = $spaFallbackPath;
                    } else {
                        abort(404);
                    }
                }
            } else {
                abort(404);
            }
        }

        $fullPath = Storage::disk('local')->path($previewPath);
        $mimeType = $this->getMimeType($path);

        // HTML and JS files need modifications for subdomain serving.
        // Use a published cache to avoid processing on every request.
        $needsProcessing = str_ends_with($path, '.html')
            || str_ends_with($path, '.htm')
            || $mimeType === 'application/javascript';

        if ($needsProcessing) {
            $cachedPath = $this->getCachedPath($project->id, $path, $fullPath);

            return response()->file($cachedPath, [
                'Content-Type' => $mimeType,
                'Cache-Control' => 'public, max-age=3600',
            ]);
        }

        return response()->file($fullPath, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }

    /**
     * Get the cached (subdomain-ready) version of a file.
     * Creates/updates the cache if the source file is newer.
     */
    private function getCachedPath(string $projectId, string $relativePath, string $sourcePath): string
    {
        $publishedPath = "published/{$projectId}/{$relativePath}";
        $cachedFullPath = Storage::disk('local')->path($publishedPath);

        // Serve cached version if it exists and is newer than the source
        if (file_exists($cachedFullPath) && filemtime($cachedFullPath) >= filemtime($sourcePath)) {
            return $cachedFullPath;
        }

        // Process the file for subdomain serving
        $content = file_get_contents($sourcePath);

        if (str_ends_with($relativePath, '.html') || str_ends_with($relativePath, '.htm')) {
            // Rewrite <base> tag to "/" so relative asset paths resolve correctly
            $content = preg_replace(
                '/<base\s+href="[^"]*"\s*\/?>/',
                '<base href="/">',
                $content
            );
        }

        if (str_ends_with($relativePath, '.js')) {
            // Fix React Router basename fallback: the builder template derives basename
            // from <base href>, falling back to "/preview" when empty. After rewriting
            // <base> to "/", the stripped value is "" (falsy), hitting this fallback.
            // Replace with "/" so the router matches the subdomain root.
            $content = str_replace('||"/preview"', '||"/"', $content);
        }

        // Ensure the cache directory exists and write
        $cacheDir = dirname($cachedFullPath);
        if (! is_dir($cacheDir)) {
            mkdir($cacheDir, 0775, true);
        }
        file_put_contents($cachedFullPath, $content);

        return $cachedFullPath;
    }

    private function getMimeType(string $path): string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return match ($extension) {
            'html' => 'text/html',
            'css' => 'text/css',
            'js' => 'application/javascript',
            'json' => 'application/json',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'webp' => 'image/webp',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'ico' => 'image/x-icon',
            default => 'application/octet-stream',
        };
    }
}
