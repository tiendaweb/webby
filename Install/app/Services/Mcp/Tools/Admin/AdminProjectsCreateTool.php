<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Project;
use App\Models\SystemSetting;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\ProjectWorkspaceService;
use App\Support\SubdomainHelper;
use Illuminate\Support\Str;

/**
 * Create a project for any account — a client's ("crear proyectos a
 * clientes") or the calling admin's own — optionally seeded with real
 * source files and published in the same call.
 *
 * This is the entry point for building a site from a prompt without a
 * template: the connector composes the files itself and passes them in
 * "files", instead of picking a template_id and handing off to the
 * platform's AI builder (a stateful, credit-consuming flow that does not
 * fit a synchronous MCP call — see AdminProjectsQueueAiBuildTool for that
 * path).
 *
 * Plan limits are advisory here: an admin acting on a client's behalf is
 * allowed to exceed them, but must opt in via respect_plan_limits=false
 * (the default) knowingly — set it to true to get the client-facing
 * behaviour instead.
 */
class AdminProjectsCreateTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(private readonly ProjectWorkspaceService $workspace) {}

    public function name(): string
    {
        return 'admin_projects_create';
    }

    public function description(): string
    {
        return 'Create a project/site for any user (a client, by user_id or user_email) or for the calling admin when neither is given. '
            .'Optionally seeds the workspace with a map of files (path => content) and publishes it to a subdomain in the same call — '
            .'this is how you build a professional site from a prompt without using a template.';
    }

    public function requiredAbility(): ?string
    {
        return 'projects:create';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'user_id' => ['type' => ['integer', 'string'], 'description' => 'Owner of the new project. Omit to create it for the calling admin.'],
                'user_email' => ['type' => 'string', 'description' => 'Alternative to user_id.'],
                'name' => ['type' => 'string', 'maxLength' => 255],
                'description' => ['type' => 'string', 'maxLength' => 1000],
                'type' => ['type' => 'string', 'enum' => ['blank', 'ai'], 'default' => 'blank'],
                'initial_prompt' => ['type' => 'string', 'description' => 'The prompt this site was built from. Stored on the project for traceability.'],
                'custom_instructions' => ['type' => 'string'],
                'template_id' => ['type' => 'integer', 'description' => 'Optional. Leave empty to build without a template.'],
                'theme_preset' => ['type' => 'string'],
                'files' => [
                    'type' => 'object',
                    'description' => 'Map of relative path => file content, e.g. {"index.html": "<!doctype html>...", "assets/app.css": "..."}. Written into the project workspace.',
                    'additionalProperties' => ['type' => 'string'],
                ],
                'publish' => ['type' => 'boolean', 'default' => false, 'description' => 'Publish to a subdomain immediately.'],
                'subdomain' => ['type' => 'string', 'description' => 'Subdomain to publish on. Auto-generated from the name when publish=true and this is omitted.'],
                'visibility' => ['type' => 'string', 'enum' => ['public', 'private'], 'default' => 'public'],
                'respect_plan_limits' => ['type' => 'boolean', 'default' => false, 'description' => 'Enforce the owner plan project/subdomain quotas instead of overriding them as an admin.'],
            ],
            'required' => ['name'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        try {
            $owner = $this->resolveOwner($arguments, $context);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

        $name = trim((string) ($arguments['name'] ?? ''));

        if ($name === '') {
            return ['success' => false, 'message' => '"name" is required.'];
        }

        $respectLimits = (bool) ($arguments['respect_plan_limits'] ?? false);

        if ($respectLimits && ! $owner->canCreateMoreProjects()) {
            return ['success' => false, 'message' => "{$owner->email} has reached the project limit of their plan."];
        }

        $files = is_array($arguments['files'] ?? null) ? $arguments['files'] : [];
        $requestedType = (string) ($arguments['type'] ?? 'blank');
        $type = in_array($requestedType, ['blank', 'ai'], true) ? $requestedType : 'blank';
        $publish = (bool) ($arguments['publish'] ?? false);
        $visibility = ($arguments['visibility'] ?? 'public') === 'private' ? 'private' : 'public';

        $project = Project::create([
            'user_id' => $owner->id,
            'type' => $type,
            'name' => $name,
            'description' => $arguments['description'] ?? null,
            'initial_prompt' => (string) ($arguments['initial_prompt'] ?? '[MCP connector]'),
            'custom_instructions' => $arguments['custom_instructions'] ?? null,
            'template_id' => $arguments['template_id'] ?? null,
            'theme_preset' => $arguments['theme_preset'] ?? null,
            // A workspace seeded with real files is already "built"; an
            // empty "ai" shell is left pending so the platform builder can
            // still pick it up.
            'build_status' => ($files !== [] || $type === 'blank') ? 'completed' : 'pending',
            'last_viewed_at' => now(),
            'api_token' => Str::random(32),
        ]);

        $written = [];
        $failed = [];

        foreach ($files as $path => $content) {
            try {
                $this->workspace->writeFile($project, (string) $path, (string) $content);
                $written[] = (string) $path;
            } catch (\Throwable $e) {
                $failed[(string) $path] = $e->getMessage();
            }
        }

        if ($files !== [] && $written === []) {
            // Nothing landed — leave no half-created project behind.
            $project->forceDelete();

            return ['success' => false, 'message' => 'No file could be written; project creation rolled back.', 'errors' => $failed];
        }

        $publishResult = null;

        if ($publish) {
            $publishResult = $this->publish($project, $owner, $arguments, $visibility, $respectLimits);
        }

        $previewWarning = null;

        if ($written !== []) {
            $previewWarning = $this->workspace->syncPreviewSafely($project);
        }

        $project->refresh();

        return [
            'success' => true,
            'project' => $this->projectSummary($project),
            'owner' => ['id' => $owner->id, 'name' => $owner->name, 'email' => $owner->email],
            'files_written' => $written,
            'files_failed' => $failed ?: null,
            'preview_warning' => $previewWarning,
            'publish' => $publishResult,
        ];
    }

    private function publish(Project $project, $owner, array $arguments, string $visibility, bool $respectLimits): array
    {
        if (! SystemSetting::get('domain_enable_subdomains', false)) {
            return ['published' => false, 'message' => 'Subdomain publishing is disabled on this platform.'];
        }

        if ($respectLimits && (! $owner->canUseSubdomains() || ! $owner->canCreateMoreSubdomains())) {
            return ['published' => false, 'message' => "The owner's plan does not allow another subdomain."];
        }

        $requested = trim((string) ($arguments['subdomain'] ?? ''));
        $subdomain = $requested !== ''
            ? SubdomainHelper::normalize($requested)
            : SubdomainHelper::generateFromString($project->name);

        if ($errors = SubdomainHelper::validate($subdomain)) {
            return ['published' => false, 'message' => $errors[0]];
        }

        if (! SubdomainHelper::isAvailable($subdomain, $project->id)) {
            return ['published' => false, 'message' => "The subdomain \"{$subdomain}\" is already taken."];
        }

        $project->update([
            'subdomain' => $subdomain,
            'published_title' => $project->published_title ?? $project->name,
            'published_description' => $project->published_description ?? ($project->description ?? ''),
            'published_visibility' => $visibility,
            'published_at' => $project->published_at ?? now(),
        ]);

        $base = SystemSetting::get('domain_base_domain', config('app.base_domain'));

        return [
            'published' => true,
            'subdomain' => $subdomain,
            'url' => $base ? "https://{$subdomain}.{$base}" : url("/app/{$project->id}/"),
        ];
    }
}
