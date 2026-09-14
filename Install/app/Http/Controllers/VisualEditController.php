<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectRevisionService;
use App\Services\VisualEditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use InvalidArgumentException;
use RuntimeException;

class VisualEditController extends Controller
{
    public function __construct(
        protected VisualEditService $visualEditService,
        protected ProjectRevisionService $revisionService,
    ) {}

    public function store(Project $project, Request $request): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'selector' => ['required', 'string', 'max:2000'],
            'tagName' => ['required', 'string', 'max:50'],
            'field' => ['required', Rule::in(['text', 'href', 'src', 'placeholder', 'title', 'alt'])],
            'originalValue' => ['nullable', 'string', 'max:200000'],
            'newValue' => ['nullable', 'string', 'max:200000'],
            'originalValueAliases' => ['nullable', 'array', 'max:20'],
            'originalValueAliases.*' => ['string', 'max:200000'],
            'sourcePath' => ['nullable', 'string', 'max:500'],
            'previewPath' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $this->revisionService->create($project, $request->user(), 'visual_edit', 'Antes de editar visualmente', [
                'selector' => $validated['selector'],
                'field' => $validated['field'],
            ]);

            return response()->json($this->visualEditService->apply($project, $validated));
        } catch (InvalidArgumentException|RuntimeException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
