<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Project;
use App\Models\User;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;

/**
 * The "fetch" half of ChatGPT's search/fetch connector contract: turn an id
 * produced by the search tool into its full content.
 *
 * Ids are namespaced so one tool can resolve three different things:
 *   project:<id>            → project detail + file listing
 *   user:<id>               → customer detail + their projects
 *   file:<projectId>:<path> → the contents of one workspace file
 *
 * @see AdminSearchTool
 */
class AdminFetchTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'fetch';
    }

    public function description(): string
    {
        return 'Retrieve the full record behind an id returned by "search". '
            .'Accepts "project:<id>", "user:<id>" or "file:<projectId>:<path>". A bare id is treated as a project.';
    }

    public function requiredAbility(): ?string
    {
        return 'projects:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'id' => ['type' => 'string', 'description' => 'An id from "search", e.g. "project:9f1c…" or "file:9f1c…:index.html".'],
            ],
            'required' => ['id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $id = trim((string) ($arguments['id'] ?? ''));

        if ($id === '') {
            return ['success' => false, 'message' => '"id" is required.'];
        }

        [$kind, $rest] = $this->split($id);

        return match ($kind) {
            'user' => $this->fetchUser($rest),
            'file' => $this->fetchFile($rest),
            default => $this->fetchProject($rest),
        };
    }

    /** @return array{0:string,1:string} */
    private function split(string $id): array
    {
        foreach (['project', 'user', 'file'] as $kind) {
            if (str_starts_with($id, "{$kind}:")) {
                return [$kind, substr($id, strlen($kind) + 1)];
            }
        }

        return ['project', $id];
    }

    private function fetchProject(string $id): array
    {
        try {
            $project = $this->resolveProject(['project_id' => $id]);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        $files = [];

        try {
            $files = $this->workspace->listFiles($project)['files'] ?? [];
        } catch (\Throwable) {
            // A project whose workspace was never created has no files yet.
        }

        return [
            'success' => true,
            'id' => "project:{$project->id}",
            'title' => $project->name,
            'url' => $this->publicUrl($project) ?? url("/project/{$project->id}"),
            'project' => $this->projectSummary($project),
            'owner' => $project->user ? ['id' => $project->user->id, 'name' => $project->user->name, 'email' => $project->user->email] : null,
            'files' => $files,
            'text' => $project->description ?: $project->initial_prompt,
        ];
    }

    private function fetchUser(string $id): array
    {
        $user = User::find($id) ?? User::where('email', $id)->first();

        if (! $user) {
            return ['success' => false, 'message' => "User not found: {$id}"];
        }

        return [
            'success' => true,
            'id' => "user:{$user->id}",
            'title' => "{$user->name} <{$user->email}>",
            'url' => url('/admin/users'),
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'plan_id' => $user->plan_id,
                'build_credits' => $user->build_credits,
                'created_at' => $user->created_at?->toIso8601String(),
            ],
            'projects' => Project::where('user_id', $user->id)->get()->map(fn (Project $p) => $this->projectSummary($p))->values(),
        ];
    }

    private function fetchFile(string $rest): array
    {
        // "<projectId>:<path>" — the path may itself contain ":" on exotic
        // filenames, so only the first separator is significant.
        $separator = strpos($rest, ':');

        if ($separator === false) {
            return ['success' => false, 'message' => 'A file id looks like "file:<projectId>:<path>".'];
        }

        $projectId = substr($rest, 0, $separator);
        $path = substr($rest, $separator + 1);

        try {
            $project = $this->resolveProject(['project_id' => $projectId]);
            $file = $this->workspace->readFile($project, $path);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        return [
            'success' => true,
            'id' => "file:{$project->id}:{$path}",
            'title' => $path,
            'url' => url("/project/{$project->id}"),
            'text' => $file['content'] ?? null,
            'file' => $file,
        ];
    }
}
