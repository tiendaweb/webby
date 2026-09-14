<?php

namespace App\Services\Mcp\Concerns;

use App\Models\Project;
use App\Models\User;
use RuntimeException;

/**
 * Shared lookup + ability helpers for admin-server tools. Admin tools act
 * across every tenant, so "which project" and "which user" is an argument
 * rather than something derived from the session — these helpers keep that
 * resolution (and its error messages) identical in every tool.
 */
trait ResolvesAdminTargets
{
    protected function resolveProject(array $arguments, string $key = 'project_id'): Project
    {
        $id = trim((string) ($arguments[$key] ?? ''));

        if ($id === '') {
            throw new RuntimeException("\"{$key}\" is required.");
        }

        $project = Project::withTrashed()->find($id);

        if (! $project) {
            $project = Project::withTrashed()->where('subdomain', $id)->first();
        }

        if (! $project) {
            throw new RuntimeException("Project not found: {$id} (accepts a project id or a subdomain).");
        }

        return $project;
    }

    /**
     * Resolve the project owner for a create-style call: an explicit
     * user_id/user_email (creating on a client's behalf), or the calling
     * admin themselves when neither is given.
     */
    protected function resolveOwner(array $arguments, mixed $context): User
    {
        $id = $arguments['user_id'] ?? null;
        $email = trim((string) ($arguments['user_email'] ?? ''));

        if ($id !== null && $id !== '') {
            $user = User::find($id);

            if (! $user) {
                throw new RuntimeException("User not found: {$id}");
            }

            return $user;
        }

        if ($email !== '') {
            $user = User::where('email', $email)->first();

            if (! $user) {
                throw new RuntimeException("User not found: {$email}");
            }

            return $user;
        }

        if ($context instanceof User) {
            return $context;
        }

        throw new RuntimeException('Could not determine the owner: pass "user_id" or "user_email".');
    }

    /**
     * Whether the calling token additionally carries the escalation
     * ability a tool needs for its most dangerous branch (e.g. touching a
     * protected system table). Tools call this instead of failing the
     * whole call, so the safe branches stay usable on a narrower token.
     */
    protected function tokenCan(mixed $context, string $ability): bool
    {
        if (! $context instanceof User) {
            return false;
        }

        $token = $context->currentAccessToken();

        return $token !== null && $token->can($ability);
    }

    protected function projectSummary(Project $project): array
    {
        return [
            'id' => $project->id,
            'name' => $project->name,
            'type' => $project->type,
            'user_id' => $project->user_id,
            'subdomain' => $project->subdomain,
            'custom_domain' => $project->custom_domain,
            'build_status' => $project->build_status,
            'published_at' => $project->published_at?->toIso8601String(),
            'published_visibility' => $project->published_visibility,
            'deleted_at' => $project->deleted_at?->toIso8601String(),
            'url' => $this->publicUrl($project),
            'workspace_url' => url("/project/{$project->id}"),
        ];
    }

    protected function publicUrl(Project $project): ?string
    {
        if ($project->custom_domain && $project->custom_domain_verified) {
            return "https://{$project->custom_domain}";
        }

        if ($project->subdomain) {
            $base = \App\Models\SystemSetting::get('domain_base_domain', config('app.base_domain'));

            if ($base) {
                return "https://{$project->subdomain}.{$base}";
            }
        }

        return $project->published_at ? url("/app/{$project->id}/") : null;
    }
}
