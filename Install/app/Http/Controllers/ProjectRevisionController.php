<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectRevision;
use App\Services\ProjectRevisionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class ProjectRevisionController extends Controller
{
    public function __construct(
        protected ProjectRevisionService $revisionService,
    ) {}

    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $revisions = $project->revisions()
            ->with('user')
            ->latest()
            ->limit(30)
            ->get()
            ->map(fn (ProjectRevision $revision) => $this->revisionService->payload($revision));

        return response()->json([
            'revisions' => $revisions,
        ]);
    }

    public function store(Project $project, Request $request): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'label' => ['nullable', 'string', 'max:255'],
            'trigger' => ['nullable', 'string', 'max:50'],
        ]);

        $revision = $this->revisionService->create(
            $project,
            $request->user(),
            $validated['trigger'] ?? 'manual',
            $validated['label'] ?? 'Checkpoint manual'
        );

        return response()->json([
            'success' => true,
            'revision' => $this->revisionService->payload($revision),
        ]);
    }

    public function restore(Project $project, ProjectRevision $revision, Request $request): JsonResponse
    {
        $this->authorize('update', $project);

        if ($revision->project_id !== $project->id) {
            abort(404);
        }

        try {
            $this->revisionService->create($project, $request->user(), 'before_restore', 'Antes de restaurar');
            $result = $this->revisionService->restore($revision);

            return response()->json($result);
        } catch (RuntimeException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
