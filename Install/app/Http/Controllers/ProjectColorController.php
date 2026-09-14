<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectColorScanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProjectColorController extends Controller
{
    public function __construct(
        protected ProjectColorScanService $colorScanService,
    ) {}

    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json([
            'colors' => $this->colorScanService->scan($project),
        ]);
    }

    public function replace(Project $project, Request $request): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'sourcePath' => ['required', 'string', 'max:500'],
            'type' => ['required', 'string', 'max:40'],
            'token' => ['required', 'string', 'max:500'],
            'newValue' => ['required', 'string', 'max:500'],
        ]);

        try {
            return response()->json($this->colorScanService->replace($project, $validated));
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
