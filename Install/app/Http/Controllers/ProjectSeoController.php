<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\ProjectRevisionService;
use App\Services\ProjectSeoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class ProjectSeoController extends Controller
{
    public function __construct(
        protected ProjectSeoService $seoService,
        protected ProjectRevisionService $revisionService,
    ) {}

    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json($this->seoService->index($project));
    }

    public function update(Project $project, Request $request): JsonResponse
    {
        $this->authorize('update', $project);

        $validated = $request->validate([
            'page_path' => ['required', 'string', 'max:500'],
            'title' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:180'],
            'slug' => ['nullable', 'string', 'max:180'],
            'canonical_url' => ['nullable', 'string', 'max:255'],
            'social_image' => ['nullable', 'string', 'max:255'],
            'favicon' => ['nullable', 'string', 'max:255'],
            'indexable' => ['boolean'],
        ]);

        try {
            $this->revisionService->create($project, $request->user(), 'seo', 'Antes de actualizar SEO', [
                'pagePath' => $validated['page_path'],
            ]);

            return response()->json($this->seoService->save($project, $validated));
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    public function audit(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json($this->seoService->audit($project));
    }
}
