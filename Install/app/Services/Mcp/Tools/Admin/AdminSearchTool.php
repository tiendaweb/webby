<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Project;
use App\Models\User;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;

/**
 * Named "search" (not "admin_search") because ChatGPT's connector contract
 * looks for a tool by exactly that name, paired with "fetch": search
 * returns {id, title, url} records, fetch resolves one id into its text.
 * Implementing the pair is what makes this server usable from ChatGPT's
 * research/connector surface as well as from plain tool calling — and it is
 * a genuinely useful entry point for Claude and Grok too, since it answers
 * "find me the site called X" without knowing whether X is an id, a
 * subdomain or a name.
 *
 * @see AdminFetchTool
 */
class AdminSearchTool extends McpTool
{
    use ResolvesAdminTargets;

    public function name(): string
    {
        return 'search';
    }

    public function description(): string
    {
        return 'Search the platform for projects/sites, customers and published subdomains matching a free-text query. '
            .'Returns records with an "id" that can be passed to the "fetch" tool for the full detail.';
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
                'query' => ['type' => 'string', 'description' => 'Free text: a project name, a subdomain, a customer name or an email.'],
                'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 50, 'default' => 20],
            ],
            'required' => ['query'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $query = trim((string) ($arguments['query'] ?? ''));

        if ($query === '') {
            return ['success' => false, 'message' => '"query" is required.'];
        }

        $limit = min(max((int) ($arguments['limit'] ?? 20), 1), 50);
        $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $query).'%';
        $results = [];

        $projects = Project::query()
            ->where(fn ($q) => $q->where('name', 'like', $like)
                ->orWhere('subdomain', 'like', $like)
                ->orWhere('description', 'like', $like)
                ->orWhere('custom_domain', 'like', $like)
                ->orWhere('id', $query))
            ->orderByDesc('updated_at')
            ->limit($limit)
            ->get();

        foreach ($projects as $project) {
            $results[] = [
                'id' => "project:{$project->id}",
                'title' => $project->name,
                'url' => $this->publicUrl($project) ?? url("/project/{$project->id}"),
                'type' => 'project',
                'subdomain' => $project->subdomain,
                'published' => $project->published_at !== null,
            ];
        }

        $users = User::query()
            ->where(fn ($q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like))
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        foreach ($users as $user) {
            $results[] = [
                'id' => "user:{$user->id}",
                'title' => "{$user->name} <{$user->email}>",
                'url' => url("/admin/users?search={$user->email}"),
                'type' => 'user',
                'role' => $user->role,
            ];
        }

        return [
            'success' => true,
            'query' => $query,
            'results' => array_slice($results, 0, $limit),
            'count' => min(count($results), $limit),
        ];
    }
}
