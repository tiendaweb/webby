<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\SystemSetting;
use App\Services\BroadcastService;
use App\Services\TemplateClassifierService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Services\ProjectWorkspaceService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function __construct(
        protected TemplateClassifierService $templateClassifier
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $tab = $request->get('tab', 'all');
        $search = $request->get('search');
        $sort = $request->get('sort', 'last-edited');
        $visibility = $request->get('visibility');

        // Build base query based on tab
        $query = match ($tab) {
            'favorites' => $user->projects()->with('user')->where('is_starred', true),
            default => $user->projects()->with('user'),
        };

        // Apply search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Apply visibility filter
        if ($visibility && in_array($visibility, ['public', 'private'])) {
            $query->where('is_public', $visibility === 'public');
        }

        // Apply sorting
        $query = match ($sort) {
            'name' => $query->orderBy('name', 'asc'),
            'created' => $query->orderBy('created_at', 'desc'),
            default => $query->orderBy('updated_at', 'desc'),
        };

        $perPage = $this->perPage($request);

        // Paginate
        $projects = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Project $project) => $this->projectPayload($project));

        $counts = [
            'all' => $user->projects()->count(),
            'favorites' => $user->projects()->where('is_starred', true)->count(),
            'trash' => $user->projects()->onlyTrashed()->count(),
        ];

        $filters = [
            'search' => $search,
            'sort' => $sort,
            'visibility' => $visibility,
            'per_page' => $perPage,
        ];

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
            'counts' => $counts,
            'activeTab' => $tab,
            'filters' => $filters,
            'baseDomain' => SystemSetting::get('domain_base_domain', config('app.base_domain', 'example.com')),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        // Block demo admin from creating projects — they should register their own account
        if (config('app.demo') && Auth::id() === 1) {
            return back()->withErrors([
                'prompt' => 'The demo admin account cannot create projects. Register your own account to test the hosting workspace.',
            ]);
        }

        // Check if broadcast is configured AND working (force fresh check)
        $broadcastService = app(BroadcastService::class);
        $errorMessage = $broadcastService->getErrorMessage();

        if ($errorMessage) {
            return back()->withErrors([
                'prompt' => $errorMessage,
            ]);
        }

        // Check project limit
        if (! $request->user()->canCreateMoreProjects()) {
            $plan = $request->user()->getCurrentPlan();
            $maxProjects = $plan ? $plan->getMaxProjects() : 0;

            return back()->withErrors([
                'prompt' => $maxProjects === 0
                    ? 'Your plan does not include project creation. Please upgrade your plan to create projects.'
                    : "You have reached the maximum number of projects ({$maxProjects}) allowed by your plan. Please upgrade to create more projects.",
            ]);
        }

        // Check if user can perform builds
        $buildCreditService = app(\App\Services\BuildCreditService::class);
        $canBuild = $buildCreditService->canPerformBuild($request->user());

        if (! $canBuild['allowed']) {
            return back()->withErrors([
                'prompt' => $canBuild['reason'],
            ]);
        }

        // Block concurrent builds for the same user
        $activeBuild = Project::where('user_id', $request->user()->id)
            ->where('build_status', 'building')
            ->exists();

        if ($activeBuild) {
            return back()->withErrors([
                'prompt' => 'You have an active session. Wait for it to complete, or stop it.',
            ]);
        }

        $validated = $request->validate([
            'prompt' => 'required|string|max:2000',
            'template_id' => 'nullable|integer|exists:templates,id',
            'theme_preset' => 'nullable|string|in:default,arctic,summer,fragrant,slate,feminine,forest,midnight,coral,mocha,ocean,ruby',
        ]);

        // Generate a name from the prompt (first 50 chars)
        $name = str($validated['prompt'])->limit(50, '...')->toString();
        $templateId = $validated['template_id'] ?? null;
        $themePreset = $validated['theme_preset'] ?? null;

        if ($templateId) {
            $template = \App\Models\Template::find($templateId);
            if ($template && ! $template->isAvailableForPlan($request->user()->getCurrentPlan())) {
                return back()->withErrors([
                    'prompt' => 'The selected template is not available for your plan.',
                ]);
            }
        }

        if (! $templateId) {
            $recommendation = $this->templateClassifier->recommendTemplates(
                $validated['prompt'],
                $request->user()->getCurrentPlan(),
                1
            );

            $templateId = $recommendation['templates'][0]['id'] ?? null;
            $themePreset = $themePreset ?? $recommendation['theme_preset'] ?? null;
        }

        $project = Project::create([
            'user_id' => $request->user()->id,
            'type' => 'ai',
            'name' => $name,
            'initial_prompt' => $validated['prompt'],
            'template_id' => $templateId,
            'theme_preset' => $themePreset,
            'last_viewed_at' => now(),
        ]);

        return redirect()->route('chat', $project);
    }

    public function trash(Request $request): Response
    {
        $user = $request->user();
        $search = $request->get('search');
        $sort = $request->get('sort', 'last-edited');

        $query = $user->projects()
            ->onlyTrashed()
            ->with('user');

        // Apply search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Apply sorting
        $query = match ($sort) {
            'name' => $query->orderBy('name', 'asc'),
            'created' => $query->orderBy('created_at', 'desc'),
            default => $query->orderBy('deleted_at', 'desc'),
        };

        $perPage = $this->perPage($request);

        // Paginate
        $projects = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Project $project) => $this->projectPayload($project));

        $counts = [
            'all' => $user->projects()->count(),
            'favorites' => $user->projects()->where('is_starred', true)->count(),
            'trash' => $user->projects()->onlyTrashed()->count(),
        ];

        $filters = [
            'search' => $search,
            'sort' => $sort,
            'visibility' => null, // Not applicable for trash
            'per_page' => $perPage,
        ];

        return Inertia::render('Projects/Index', [
            'projects' => $projects,
            'counts' => $counts,
            'activeTab' => 'trash',
            'filters' => $filters,
            'baseDomain' => SystemSetting::get('domain_base_domain', config('app.base_domain', 'example.com')),
        ]);
    }

    public function toggleStar(Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $project->update(['is_starred' => ! $project->is_starred]);

        return back();
    }

    public function rename(Request $request, Project $project): RedirectResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $name = trim($validated['name']);

        $project->update([
            'name' => $name,
            'published_title' => $name,
        ]);

        return back()->with('message', 'Project renamed successfully');
    }

    public function duplicate(Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        // Block demo admin from duplicating projects
        if (config('app.demo') && Auth::id() === 1) {
            return back()->withErrors([
                'project' => 'The demo admin account cannot create projects. Register your own account to test the hosting workspace.',
            ]);
        }

        // Check project limit
        if (! request()->user()->canCreateMoreProjects()) {
            $plan = request()->user()->getCurrentPlan();
            $maxProjects = $plan ? $plan->getMaxProjects() : 0;

            return back()->withErrors([
                'project' => $maxProjects === 0
                    ? 'Your plan does not include project creation. Please upgrade your plan to create projects.'
                    : "You have reached the maximum number of projects ({$maxProjects}) allowed by your plan. Please upgrade to create more projects.",
            ]);
        }

        $newProject = $project->duplicate(request()->user());

        return redirect()->route('projects.index')
            ->with('message', "Project duplicated as '{$newProject->name}'");
    }

    public function destroy(Project $project): RedirectResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        return back()->with('message', 'Project moved to trash');
    }

    /**
     * Descarga el proyecto entero como zip.
     *
     * La ruta va firmada y caduca: el enlace se genera desde una herramienta
     * de conector, viaja por una conversación y no debería seguir sirviendo
     * el sitio de un cliente una semana después. La firma incluye el id, así
     * que un enlace no vale para otro proyecto.
     *
     * El zip se arma en el momento y se borra al terminar el envío. Guardarlo
     * dejaría copias completas de cada sitio acumulándose en disco, que es
     * justo lo que uno no quiere de una función pensada para usarse seguido.
     */
    public function export(Request $request, Project $project, ProjectWorkspaceService $workspace)
    {
        // La firma prueba que el enlace lo emitió la plataforma, no quién lo
        // está abriendo. Un enlace reenviado por error a otra pestaña abierta
        // no debería entregar el sitio de un cliente, así que además de la
        // firma se exige ser el dueño (o un administrador).
        $user = $request->user();

        if (! $user || (! $user->isAdmin() && ! $user->can('view', $project))) {
            abort(403, 'This export link is not for your account.');
        }

        $temporal = tempnam(sys_get_temp_dir(), 'webby-export-');

        try {
            $workspace->exportZip($project, $temporal);
        } catch (\Throwable $e) {
            @unlink($temporal);

            abort(422, $e->getMessage());
        }

        $nombre = Str::slug($project->name ?: 'proyecto').'-'.now()->format('Ymd-His').'.zip';

        return response()->download($temporal, $nombre, [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(true);
    }

    public function restore(Project $project): RedirectResponse
    {
        $this->authorize('restore', $project);

        $project->restore();

        return redirect()->route('projects.index')
            ->with('message', 'Project restored successfully');
    }

    public function forceDelete(Project $project): RedirectResponse
    {
        $this->authorize('forceDelete', $project);

        $project->forceDelete();

        return back()->with('message', 'Project permanently deleted');
    }

    private function perPage(Request $request): int
    {
        $perPage = (int) $request->get('per_page', 12);

        return in_array($perPage, [12, 24, 48], true) ? $perPage : 12;
    }

    /**
     * Lista plana de los proyectos del usuario para el selector rápido.
     *
     * Devuelve JSON y no una página de Inertia porque quien la pide ya está
     * dentro de un proyecto: cambiar de uno a otro no debería costar una
     * recarga entera de /projects, que es lo que pasaba cuando el botón de
     * inicio era un enlace.
     *
     * Sin paginar a propósito: son unas pocas decenas por usuario y el modal
     * filtra en el navegador, así que buscar no pega otra vuelta al servidor.
     */
    public function switcher(Request $request): JsonResponse
    {
        $projects = $request->user()->projects()
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'type', 'thumbnail', 'subdomain', 'is_starred', 'published_at', 'updated_at'])
            ->map(fn (Project $project) => [
                'id' => $project->id,
                'name' => $project->name,
                'type' => $project->type,
                'thumbnail' => $project->thumbnail,
                'subdomain' => $project->subdomain,
                'is_starred' => (bool) $project->is_starred,
                'is_published' => $project->published_at !== null,
                'updated_at' => $project->updated_at?->toIso8601String(),
            ]);

        return response()->json(['projects' => $projects]);
    }

    private function projectPayload(Project $project): array
    {
        $payload = $project->toArray();
        $payload['preview_url'] = Storage::disk('local')->exists("previews/{$project->id}")
            ? "/preview/{$project->id}/"
            : null;

        return $payload;
    }
}
