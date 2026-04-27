<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\SystemSetting;
use App\Services\BroadcastService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
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

        // Paginate
        $projects = $query->paginate(12)->withQueryString();

        $counts = [
            'all' => $user->projects()->count(),
            'favorites' => $user->projects()->where('is_starred', true)->count(),
            'trash' => $user->projects()->onlyTrashed()->count(),
        ];

        $filters = [
            'search' => $search,
            'sort' => $sort,
            'visibility' => $visibility,
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
                'prompt' => 'The demo admin account cannot create projects. Register your own account to test the AI website builder.',
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

        $project = Project::create([
            'user_id' => $request->user()->id,
            'name' => $name,
            'initial_prompt' => $validated['prompt'],
            'template_id' => $validated['template_id'] ?? null,
            'theme_preset' => $validated['theme_preset'] ?? null,
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

        // Paginate
        $projects = $query->paginate(12)->withQueryString();

        $counts = [
            'all' => $user->projects()->count(),
            'favorites' => $user->projects()->where('is_starred', true)->count(),
            'trash' => $user->projects()->onlyTrashed()->count(),
        ];

        $filters = [
            'search' => $search,
            'sort' => $sort,
            'visibility' => null, // Not applicable for trash
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

    public function duplicate(Project $project): RedirectResponse
    {
        $this->authorize('view', $project);

        // Block demo admin from duplicating projects
        if (config('app.demo') && Auth::id() === 1) {
            return back()->withErrors([
                'project' => 'The demo admin account cannot create projects. Register your own account to test the AI website builder.',
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
}
