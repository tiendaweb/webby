<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ChecksDemoMode;
use App\Models\Builder;
use App\Services\AdminStatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class BuilderController extends Controller
{
    use ChecksDemoMode;

    /**
     * Display list of all builders.
     */
    public function index(Request $request): Response
    {
        $builders = Builder::query()
            ->withCount('projects')
            ->orderBy('name')
            ->get()
            ->map(fn ($builder) => [
                'id' => $builder->id,
                'name' => $builder->name,
                'url' => $builder->url,
                'port' => $builder->port,
                'server_key' => $builder->server_key,
                'status' => $builder->status,
                'max_iterations' => $builder->max_iterations,
                'projects_count' => $builder->projects_count,
                'last_triggered_at' => $builder->last_triggered_at?->toISOString(),
            ]);

        return Inertia::render('Admin/Builders', [
            'user' => $request->user()->only('id', 'name', 'email', 'avatar', 'role'),
            'builders' => $builders,
        ]);
    }

    /**
     * Store a new builder.
     */
    public function store(Request $request): JsonResponse|RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'url' => 'required|string|max:255',
            'port' => 'required|integer|min:1|max:65535',
            'server_key' => 'required|string|unique:builders,server_key',
            'status' => 'sometimes|in:active,inactive',
            'max_iterations' => 'nullable|integer|min:5|max:100',
        ]);

        $builder = Builder::create($validated);

        app(AdminStatsService::class)->clearCache();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'message' => 'Builder created successfully',
                'builder' => $builder,
            ], 201);
        }

        return back();
    }

    /**
     * Update an existing builder.
     */
    public function update(Request $request, Builder $builder): JsonResponse|RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'url' => 'sometimes|string|max:255',
            'port' => 'sometimes|integer|min:1|max:65535',
            'server_key' => 'sometimes|string|unique:builders,server_key,'.$builder->id,
            'status' => 'sometimes|in:active,inactive',
            'max_iterations' => 'sometimes|nullable|integer|min:5|max:100',
        ]);

        $builder->update($validated);

        app(AdminStatsService::class)->clearCache();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'message' => 'Builder updated successfully',
                'builder' => $builder,
            ]);
        }

        return back();
    }

    /**
     * Delete a builder.
     */
    public function destroy(Request $request, Builder $builder): JsonResponse|RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $builder->delete();

        app(AdminStatsService::class)->clearCache();

        if ($request->wantsJson() && ! $request->header('X-Inertia')) {
            return response()->json([
                'message' => 'Builder deleted successfully',
            ]);
        }

        return back();
    }

    /**
     * Get details from a builder (version, sessions, online status).
     */
    public function getDetails(Builder $builder): JsonResponse
    {
        $details = $builder->getDetails();

        return response()->json($details);
    }

    /**
     * Generate a new server key.
     */
    public function generateKey(): JsonResponse
    {
        return response()->json([
            'server_key' => Str::uuid()->toString(),
        ]);
    }
}
