<?php

namespace App\Http\Middleware;

use App\Models\Project;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware to verify project API tokens for generated app requests.
 *
 * Generated apps can authenticate with either:
 * 1. X-Project-Token header
 * 2. Bearer token in Authorization header
 *
 * The token must match the project's api_token field.
 */
class VerifyProjectToken
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $projectId = $request->route('projectId');

        if (! $projectId) {
            return response()->json([
                'error' => 'Project ID is required.',
            ], 400);
        }

        $project = Project::find($projectId);

        if (! $project) {
            return response()->json([
                'error' => 'Project not found.',
            ], 404);
        }

        // Check for token in various formats
        $token = $request->header('X-Project-Token')
            ?? $request->bearerToken()
            ?? $request->input('api_token');

        if (! $token) {
            return response()->json([
                'error' => 'API token is required.',
            ], 401);
        }

        // Verify the token matches the project's API token
        if (! $project->api_token || ! hash_equals($project->api_token, $token)) {
            return response()->json([
                'error' => 'Invalid API token.',
            ], 401);
        }

        // Store project in request for use in controller
        $request->attributes->set('project', $project);

        return $next($request);
    }
}
