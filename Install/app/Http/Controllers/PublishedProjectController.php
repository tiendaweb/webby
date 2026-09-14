<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectWorkspaceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Process\Process;

class PublishedProjectController extends Controller
{
    public function __construct(
        protected ProjectWorkspaceService $workspaceService
    ) {}

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

        if ($project->type === 'blank') {
            $phpResponse = $this->servePhpIfNeeded($request, $project, $path);
            if ($phpResponse) {
                return $phpResponse;
            }
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
            'js', 'mjs' => 'application/javascript',
            'json' => 'application/json',
            'map' => 'application/json',
            'webmanifest' => 'application/manifest+json',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'webp' => 'image/webp',
            'woff' => 'font/woff',
            'woff2' => 'font/woff2',
            'ttf' => 'font/ttf',
            'ico' => 'image/x-icon',
            'wasm' => 'application/wasm',
            default => 'application/octet-stream',
        };
    }

    protected function servePhpIfNeeded(Request $request, Project $project, string $path): ?Response
    {
        $root = $this->workspaceService->root($project);
        $entry = $path === '' || $path === 'index.html' ? 'index.php' : $path;

        try {
            $entry = $this->workspaceService->normalizePath($entry);
        } catch (\Throwable) {
            abort(403, 'Invalid path');
        }

        if (! str_ends_with(strtolower($entry), '.php')) {
            if (! str_contains($path, '.') && Storage::disk('local')->exists("{$root}/index.php")) {
                $entry = 'index.php';
            } else {
                return null;
            }
        }

        $storagePath = "{$root}/{$entry}";
        if (! Storage::disk('local')->exists($storagePath)) {
            return null;
        }

        if (! $project->user?->getCurrentPlan()?->phpRuntimeEnabled()) {
            abort(403, 'PHP runtime is not enabled for this project plan.');
        }

        $scriptPath = Storage::disk('local')->path($storagePath);
        $projectRoot = $this->workspaceService->rootPath($project);

        if (! str_starts_with(realpath($scriptPath) ?: '', realpath($projectRoot) ?: '')) {
            abort(403, 'Invalid script path');
        }

        $bootstrapPath = $this->createPhpRequestBootstrap($request);
        $env = [
            'DOCUMENT_ROOT' => $projectRoot,
            'SCRIPT_FILENAME' => $scriptPath,
            'SCRIPT_NAME' => '/'.$entry,
            'PHP_SELF' => '/'.$entry,
            'REQUEST_URI' => $request->getRequestUri(),
            'REQUEST_METHOD' => $request->method(),
            'QUERY_STRING' => $request->getQueryString() ?? '',
            'CONTENT_TYPE' => $request->headers->get('content-type', ''),
            'CONTENT_LENGTH' => (string) strlen($request->getContent()),
            'HTTP_COOKIE' => $request->headers->get('cookie', ''),
            'HTTP_HOST' => $request->getHost(),
            'HTTPS' => $request->isSecure() ? 'on' : 'off',
        ];

        $process = new Process(['php', '-d', 'auto_prepend_file='.$bootstrapPath, $scriptPath], $projectRoot, $env);
        $process->setInput($request->getContent());
        $process->setTimeout(5);
        $process->run();
        @unlink($bootstrapPath);

        if (! $process->isSuccessful()) {
            return response($process->getErrorOutput() ?: 'PHP project failed', 500, [
                'Content-Type' => 'text/plain; charset=UTF-8',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
            ]);
        }

        return response($process->getOutput(), 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    private function createPhpRequestBootstrap(Request $request): string
    {
        $path = tempnam(sys_get_temp_dir(), 'webby_php_request_');
        $server = [
            'DOCUMENT_ROOT', 'SCRIPT_FILENAME', 'SCRIPT_NAME', 'PHP_SELF', 'REQUEST_URI',
            'REQUEST_METHOD', 'QUERY_STRING', 'CONTENT_TYPE', 'CONTENT_LENGTH',
            'HTTP_COOKIE', 'HTTP_HOST', 'HTTPS',
        ];

        $code = "<?php\n";
        $code .= 'foreach ('.var_export($server, true).' as $key) { $value = getenv($key); if ($value !== false) { $_SERVER[$key] = $value; } }'."\n";
        $code .= 'parse_str($_SERVER["QUERY_STRING"] ?? "", $_GET);'."\n";
        $code .= 'if (!empty($_SERVER["HTTP_COOKIE"])) { foreach (explode(";", $_SERVER["HTTP_COOKIE"]) as $cookie) { $parts = explode("=", trim($cookie), 2); if (count($parts) === 2) { $_COOKIE[$parts[0]] = urldecode($parts[1]); } } }'."\n";
        $code .= '$body = stream_get_contents(STDIN); $contentType = $_SERVER["CONTENT_TYPE"] ?? ""; if (stripos($contentType, "application/x-www-form-urlencoded") !== false) { parse_str($body, $_POST); } $_REQUEST = array_merge($_GET, $_POST, $_COOKIE);'."\n";
        file_put_contents($path, $code);

        return $path;
    }
}
