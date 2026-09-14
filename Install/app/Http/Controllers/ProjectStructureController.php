<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectRevisionService;
use App\Services\ProjectStructureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;

class ProjectStructureController extends Controller
{
    public function __construct(
        protected ProjectStructureService $structureService,
        protected ProjectRevisionService $revisionService,
    ) {}

    public function show(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json($this->structureService->structure($project));
    }

    public function action(Project $project, Request $request): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'sourcePath' => ['required', 'string', 'max:500'],
            'nodeId' => ['required', 'string', 'max:120'],
            'action' => ['required', 'string', 'max:40'],
            'label' => ['nullable', 'string', 'max:120'],
        ]);

        try {
            $this->revisionService->create($project, $request->user(), 'structure', 'Antes de editar estructura', [
                'action' => $validated['action'],
                'sourcePath' => $validated['sourcePath'],
            ]);

            return response()->json($this->structureService->applyAction($project, $validated));
        } catch (InvalidArgumentException|RuntimeException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
