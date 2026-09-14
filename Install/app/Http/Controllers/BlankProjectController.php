<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\SystemSetting;
use App\Models\Template;
use App\Services\ProjectWorkspaceService;
use App\Support\SubdomainHelper;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

class BlankProjectController extends Controller
{
    public function __construct(
        protected ProjectWorkspaceService $workspaceService
    ) {}

    /**
     * Create a blank hosted site with local files and optional assistant support.
     */
    public function createBlank(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();

        $project = Project::create([
            'user_id' => $user->id,
            'type' => 'blank',
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'initial_prompt' => '[Blank Project - Manual Setup]',
            'build_status' => 'completed', // Already "built" (it's blank)
            'published_at' => now(),
            'api_token' => Str::random(32),
        ]);

        // Create a basic index.html
        $this->createDefaultIndexHtml($project);

        return redirect()->route('chat', $project->id);
    }

    /**
     * Create, save, and publish a blank HTML project from pasted or dropped code.
     */
    public function createFromCode(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->canCreateMoreProjects()) {
            return response()->json([
                'error' => 'You have reached the maximum number of projects allowed by your plan.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'html' => 'required|string|max:2000000',
        ]);

        $name = trim($validated['name'] ?? '') ?: 'HTML Project';

        $project = Project::create([
            'user_id' => $user->id,
            'type' => 'blank',
            'name' => $name,
            'initial_prompt' => '[Code Canvas - Manual HTML]',
            'build_status' => 'completed',
            'published_title' => $name,
            'published_visibility' => 'public',
            'published_at' => now(),
            'api_token' => Str::random(32),
        ]);

        $this->workspaceService->writeFile($project, 'index.html', $validated['html']);

        $publishedUrl = url("/app/{$project->id}/");

        if (
            SystemSetting::get('domain_enable_subdomains', false)
            && $user->canUseSubdomains()
            && $user->canCreateMoreSubdomains()
        ) {
            $subdomain = SubdomainHelper::generateFromString($name);
            $project->update(['subdomain' => $subdomain]);
            $publishedUrl = $this->publishedUrl($request, $subdomain) ?? $publishedUrl;
        }

        return response()->json([
            'success' => true,
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'subdomain' => $project->subdomain,
            ],
            'url' => $publishedUrl,
            'redirect_url' => route('chat', $project),
            'message' => 'HTML project saved and published.',
        ]);
    }

    /**
     * Create a blank project pre-populated with files from a template ZIP.
     */
    public function createFromTemplate(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->canCreateMoreProjects()) {
            return response()->json([
                'error' => 'Has alcanzado el número máximo de proyectos permitidos por tu plan.',
            ], 403);
        }

        $validated = $request->validate([
            'template_id' => 'required|integer|exists:templates,id',
            'name' => 'nullable|string|max:255',
        ]);

        $template = Template::findOrFail($validated['template_id']);

        if (! $template->isAvailableForPlan($user->getCurrentPlan())) {
            return response()->json([
                'error' => 'Esta plantilla no está disponible para tu plan.',
            ], 403);
        }

        // zip_path accessor already resolves the full filesystem path
        $zipPath = $template->getRawOriginal('zip_path')
            ? \Illuminate\Support\Facades\Storage::disk('local')->path($template->getRawOriginal('zip_path'))
            : null;

        if (! $zipPath || ! file_exists($zipPath)) {
            return response()->json([
                'error' => 'El archivo de plantilla no se encontró.',
            ], 404);
        }

        $name = trim($validated['name'] ?? '') ?: $template->name;

        $project = Project::create([
            'user_id' => $user->id,
            'type' => 'blank',
            'name' => $name,
            'initial_prompt' => "[Plantilla: {$template->name}]",
            'build_status' => 'completed',
            'published_at' => now(),
            'api_token' => Str::random(32),
        ]);

        $result = $this->workspaceService->importZipFromPath($project, $zipPath);

        return response()->json([
            'success' => true,
            'redirect_url' => route('chat', $project),
            'preview_warning' => $result['preview_warning'] ?? null,
        ]);
    }

    /**
     * Upload HTML/CSS/JS files to a blank project
     */
    public function uploadFiles(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'files.*' => 'required|file|max:10240', // 10MB per file
            'overwrite' => 'boolean',
        ]);

        $uploadedFiles = [];

        try {
            if ($request->hasFile('files')) {
                foreach ($request->file('files') as $file) {
                    $uploadedFiles[] = $this->workspaceService->uploadFile(
                        $project,
                        $file,
                        $request->boolean('overwrite')
                    );
                }
            }
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 409);
        }

        return response()->json([
            'success' => true,
            'files' => $uploadedFiles,
            'runtime' => $this->workspaceService->detectRuntime($project),
            'message' => count($uploadedFiles).' file(s) uploaded and preview updated successfully',
        ]);
    }

    /**
     * Upload a ZIP file containing the entire website
     */
    public function uploadZip(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'zip_file' => 'required|file|mimes:zip|max:102400', // 100MB
            'overwrite' => 'boolean',
        ]);

        try {
            $result = $this->workspaceService->importZip(
                $project,
                $request->file('zip_file'),
                $request->boolean('overwrite')
            );
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (RuntimeException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 409);
        }

        if (! $result['success']) {
            return response()->json($result, 409);
        }

        $message = match ($result['runtime'] ?? 'html') {
            'frontend' => 'ZIP file extracted and frontend app built successfully',
            'php' => 'ZIP file extracted and PHP site is ready',
            default => 'ZIP file extracted and indexed successfully',
        };

        return response()->json($result + [
            'message' => $message,
        ]);
    }

    public function createFile(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'path' => 'required|string|max:500',
            'content' => 'nullable|string',
        ]);

        return response()->json($this->workspaceService->writeFile(
            $project,
            $validated['path'],
            $validated['content'] ?? ''
        ));
    }

    public function createFolder(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'path' => 'required|string|max:500',
        ]);

        return response()->json($this->workspaceService->createDirectory($project, $validated['path']));
    }

    public function deletePath(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'path' => 'required|string|max:500',
        ]);

        return response()->json($this->workspaceService->deletePath($project, $validated['path']));
    }

    /**
     * Get project files
     */
    public function getFiles(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json($this->workspaceService->listFiles($project) + ['success' => true]);
    }

    /**
     * Generate preview for the blank project
     */
    public function generatePreview(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        try {
            $this->workspaceService->syncPreview($project);
        } catch (\Throwable $e) {
            $project->forceFill([
                'build_status' => 'failed',
            ])->save();

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }

        $runtime = $this->workspaceService->detectRuntime($project);
        $previewUrl = "/preview/{$project->id}/";
        $project->forceFill([
            'build_status' => 'completed',
            'build_completed_at' => now(),
        ])->save();

        return response()->json([
            'success' => true,
            'preview_url' => $previewUrl,
            'runtime' => $runtime,
            'message' => $runtime === 'frontend'
                ? 'Frontend app built. You can view it at: '.$previewUrl
                : 'Preview generated. You can view it at: '.$previewUrl,
        ]);
    }

    /**
     * Publish the blank project to a subdomain
     */
    public function publish(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'subdomain' => 'required|string|unique:projects,subdomain,'.$project->id,
            'title' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
        ]);

        // Copy preview to published directory
        $previewPath = "previews/{$project->id}";
        $publishedPath = "published/{$project->id}";

        if (Storage::disk('local')->exists($previewPath)) {
            if (Storage::disk('local')->exists($publishedPath)) {
                Storage::disk('local')->deleteDirectory($publishedPath);
            }
            Storage::disk('local')->makeDirectory($publishedPath);

            $files = Storage::disk('local')->files($previewPath);
            foreach ($files as $file) {
                $content = Storage::disk('local')->get($file);
                $relative = ltrim(str_replace($previewPath, '', $file), '/');
                Storage::disk('local')->put("{$publishedPath}/{$relative}", $content);
            }
        }

        $project->update([
            'subdomain' => $validated['subdomain'],
            'published_title' => $validated['title'] ?? $project->name,
            'published_description' => $validated['description'] ?? null,
            'published_at' => now(),
        ]);

        $baseDomain = SystemSetting::get('domain_base_domain', config('app.base_domain', 'example.com'));
        $appUrl = config('app.url');
        $scheme = parse_url($appUrl, PHP_URL_SCHEME) ?: (app()->environment('local') ? 'http' : 'https');
        $appHost = parse_url($appUrl, PHP_URL_HOST) ?: request()->getHost();
        $appPort = parse_url($appUrl, PHP_URL_PORT) ?: request()->getPort();
        $isLocal = in_array($appHost, ['localhost', '127.0.0.1', '::1'], true)
            || str_ends_with($appHost, '.lvh.me')
            || str_ends_with($appHost, '.localhost');
        $port = $isLocal && $appPort && ! in_array((int) $appPort, [80, 443], true) ? ':'.$appPort : '';
        $url = "{$scheme}://{$validated['subdomain']}.{$baseDomain}{$port}";

        return response()->json([
            'success' => true,
            'url' => $url,
            'message' => 'Project published successfully',
        ]);
    }

    /**
     * Create default index.html for blank project
     */
    private function createDefaultIndexHtml(Project $project): void
    {
        $html = <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{PROJECT_NAME}}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            padding: 40px;
            text-align: center;
            max-width: 600px;
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
        }

        p {
            color: #666;
            margin-bottom: 20px;
            font-size: 16px;
        }

        .info {
            background: #f0f4ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            border-radius: 5px;
            text-align: left;
            margin: 20px 0;
        }

        .info code {
            background: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            color: #e83e8c;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 {{PROJECT_NAME}}</h1>
        <p>Your blank project is ready!</p>

        <div class="info">
            <p><strong>📝 To customize this site:</strong></p>
            <ol style="text-align: left; padding-left: 20px;">
                <li>Upload your HTML, CSS, and JS files</li>
                <li>Or edit files directly in the file manager</li>
                <li>Click "Generate Preview" to see changes</li>
                <li>Click "Publish" to make it live</li>
            </ol>
        </div>

        <p style="margin-top: 30px; font-size: 14px; color: #999;">
            Built with <strong>aapp.pro</strong> • Static Site Hosting
        </p>
    </div>
</body>
</html>
HTML;

        $html = str_replace('{{PROJECT_NAME}}', $project->name, $html);

        // writeFile indexes the file and syncs the preview directory, so the
        // project is viewable at /preview/{id}/ immediately after creation.
        $this->workspaceService->writeFile($project, 'index.html', $html);
    }

    private function publishedUrl(Request $request, string $subdomain): ?string
    {
        $baseDomain = SystemSetting::get('domain_base_domain', config('app.base_domain'));

        if (! $baseDomain) {
            return null;
        }

        $appUrl = config('app.url');
        $scheme = parse_url($appUrl, PHP_URL_SCHEME) ?: $request->getScheme();
        $appHost = parse_url($appUrl, PHP_URL_HOST) ?: $request->getHost();
        $appPort = parse_url($appUrl, PHP_URL_PORT) ?: $request->getPort();
        $isLocal = in_array($appHost, ['localhost', '127.0.0.1', '::1'], true)
            || str_ends_with($appHost, '.lvh.me')
            || str_ends_with($appHost, '.localhost');

        $port = $isLocal && $appPort && ! in_array((int) $appPort, [80, 443], true) ? ':'.$appPort : '';

        return "{$scheme}://{$subdomain}.{$baseDomain}{$port}";
    }

}
