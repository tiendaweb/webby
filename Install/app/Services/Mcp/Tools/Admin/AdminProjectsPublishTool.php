<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\SystemSetting;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;
use App\Support\SubdomainHelper;

/**
 * Publish or unpublish any project on a subdomain. Mirrors
 * ProjectPublishController's validation (format, availability, uniqueness)
 * but lets an admin waive the owner's plan gating, which is the point of
 * doing it from the admin connector.
 */
class AdminProjectsPublishTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_projects_publish';
    }

    public function description(): string
    {
        return 'Publish any project to a subdomain (or unpublish it with unpublish=true). Subdomain is auto-generated from the project name when omitted. Plan gating is waived unless respect_plan_limits=true.';
    }

    public function requiredAbility(): ?string
    {
        return 'projects:publish';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string'],
                'subdomain' => ['type' => 'string', 'maxLength' => 63],
                'visibility' => ['type' => 'string', 'enum' => ['public', 'private'], 'default' => 'public'],
                'title' => ['type' => 'string'],
                'description' => ['type' => 'string'],
                'unpublish' => ['type' => 'boolean', 'default' => false],
                'respect_plan_limits' => ['type' => 'boolean', 'default' => false],
            ],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $project = $this->resolveProject($arguments);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        if ($arguments['unpublish'] ?? false) {
            $project->update(['published_at' => null, 'subdomain' => null]);

            return ['success' => true, 'action' => 'unpublished', 'project' => $this->projectSummary($project->fresh())];
        }

        if (! SystemSetting::get('domain_enable_subdomains', false)) {
            return ['success' => false, 'message' => 'Subdomain publishing is disabled on this platform.'];
        }

        $owner = $project->user;
        $respectLimits = (bool) ($arguments['respect_plan_limits'] ?? false);

        if ($respectLimits && $owner) {
            if (! $owner->canUseSubdomains()) {
                return ['success' => false, 'message' => "The owner's plan does not include subdomain publishing."];
            }

            if ($project->subdomain === null && ! $owner->canCreateMoreSubdomains()) {
                return ['success' => false, 'message' => "The owner's subdomain limit has been reached."];
            }
        }

        $requested = trim((string) ($arguments['subdomain'] ?? ''));
        $subdomain = $requested !== ''
            ? SubdomainHelper::normalize($requested)
            : ($project->subdomain ?: SubdomainHelper::generateFromString($project->name));

        if ($errors = SubdomainHelper::validate($subdomain)) {
            return ['success' => false, 'message' => $errors[0]];
        }

        if (! SubdomainHelper::isAvailable($subdomain, $project->id)) {
            return ['success' => false, 'message' => "The subdomain \"{$subdomain}\" is already taken."];
        }

        $visibility = ($arguments['visibility'] ?? 'public') === 'private' ? 'private' : 'public';

        $project->update([
            'subdomain' => $subdomain,
            'published_title' => $arguments['title'] ?? $project->published_title ?? $project->name,
            'published_description' => $arguments['description'] ?? $project->published_description ?? ($project->description ?? ''),
            'published_visibility' => $visibility,
            'published_at' => $project->published_at ?? now(),
        ]);

        // Publishing a project whose build is broken would put it live as a
        // 404, so the warning has to travel with the success.
        $previewWarning = $this->workspace->syncPreviewSafely($project);

        $base = SystemSetting::get('domain_base_domain', config('app.base_domain'));

        return [
            'success' => true,
            'action' => 'published',
            'preview_warning' => $previewWarning,
            'subdomain' => $subdomain,
            'url' => $base ? "https://{$subdomain}.{$base}" : url("/app/{$project->id}/"),
            'project' => $this->projectSummary($project->fresh()),
        ];
    }
}
