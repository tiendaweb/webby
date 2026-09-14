<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectWorkspaceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Process\Process;

class AppPreviewController extends Controller
{
    public function __construct(
        protected ProjectWorkspaceService $workspaceService
    ) {}

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

        if ($project->type === 'blank') {
            $phpResponse = $this->servePhpIfNeeded($request, $project, $path);
            if ($phpResponse) {
                return $phpResponse;
            }

            $this->regeneratePreviewIfMissing($project);
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
     * Self-heal blank projects whose preview directory was never generated
     * (e.g. legacy projects created before previews were synced on creation).
     */
    protected function regeneratePreviewIfMissing(Project $project): void
    {
        $previewPath = "previews/{$project->id}";

        if (Storage::disk('local')->exists($previewPath)) {
            return;
        }

        if (! Storage::disk('local')->exists($this->workspaceService->root($project))) {
            return;
        }

        try {
            $this->workspaceService->syncPreview($project);
        } catch (\Throwable) {
            // Serving will fall through to a 404 when the build cannot run.
        }
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
            if (($path === '' || $path === 'index.html' || ! str_contains($path, '.')) && Storage::disk('local')->exists("{$root}/index.php")) {
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

        $bootstrapPath = $this->createPhpRequestBootstrap();
        $process = new Process(['php', '-d', 'auto_prepend_file='.$bootstrapPath, $scriptPath], $projectRoot, [
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
        ]);
        $process->setInput($request->getContent());
        $process->setTimeout(5);
        $process->run();
        @unlink($bootstrapPath);

        if (! $process->isSuccessful()) {
            return response($process->getErrorOutput() ?: 'PHP preview failed', 500, [
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

    private function createPhpRequestBootstrap(): string
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
            'map' => 'application/json',
            'webmanifest' => 'application/manifest+json',
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
            'wasm' => 'application/wasm',
        ];

        return $mimeTypes[$extension] ?? 'application/octet-stream';
    }
}
