<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectRevisionService;
use App\Services\SectionCodeEditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use RuntimeException;

class SectionCodeEditController extends Controller
{
    public function __construct(
        protected SectionCodeEditService $sectionCodeEditService,
        protected ProjectRevisionService $revisionService,
    ) {}

    public function resolve(Project $project, Request $request): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'selector' => ['required', 'string', 'max:2000'],
            'tagName' => ['required', 'string', 'max:50'],
            'outerHTML' => ['required', 'string', 'max:1000000'],
            'textPreview' => ['nullable', 'string', 'max:1000'],
            'sourcePath' => ['nullable', 'string', 'max:500'],
            'previewPath' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            return response()->json($this->sectionCodeEditService->resolve($project, $validated));
        } catch (InvalidArgumentException|RuntimeException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    public function save(Project $project, Request $request): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'sourcePath' => ['required', 'string', 'max:500'],
            'originalCode' => ['required', 'string', 'max:1000000'],
            'newCode' => ['nullable', 'string', 'max:1000000'],
        ]);

        try {
            $this->revisionService->create($project, $request->user(), 'section_code', 'Antes de editar código de sección', [
                'sourcePath' => $validated['sourcePath'],
            ]);

            return response()->json($this->sectionCodeEditService->save($project, $validated));
        } catch (InvalidArgumentException|RuntimeException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
