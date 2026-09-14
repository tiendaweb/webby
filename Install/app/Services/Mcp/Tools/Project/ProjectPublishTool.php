<?php

namespace App\Services\Mcp\Tools\Project;

use App\Models\SystemSetting;
use App\Services\Mcp\McpTool;
use App\Support\SubdomainHelper;

/**
 * Mirrors ProjectPublishController::publish()'s validation exactly
 * (subdomain format/availability, plan gating for subdomains/private
 * visibility/subdomain quota).
 */
class ProjectPublishTool extends McpTool
{
    public function name(): string
    {
        return 'project_publish';
    }

    public function description(): string
    {
        return 'Publish this project to a subdomain (e.g. "myapp" -> myapp.<base-domain>).';
    }

    public function requiredAbility(): ?string
    {
        return 'publish:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'subdomain' => ['type' => 'string', 'maxLength' => 63],
                'visibility' => ['type' => 'string', 'enum' => ['public', 'private'], 'default' => 'public'],
            ],
            'required' => ['subdomain'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];
        $user = $project->user;

        if (! SystemSetting::get('domain_enable_subdomains', false)) {
            return ['success' => false, 'message' => 'Subdomain publishing is not enabled on this platform.'];
        }

        if (! $user || ! $user->canUseSubdomains()) {
            return ['success' => false, 'message' => "This project's plan does not include subdomain publishing."];
        }

        $isNewSubdomain = $project->subdomain === null;
        if ($isNewSubdomain && ! $user->canCreateMoreSubdomains()) {
            return ['success' => false, 'message' => 'The subdomain limit for this account has been reached.'];
        }

        $subdomain = SubdomainHelper::normalize((string) ($arguments['subdomain'] ?? ''));
        $errors = SubdomainHelper::validate($subdomain);

        if ($errors) {
            return ['success' => false, 'message' => $errors[0]];
        }

        if (! SubdomainHelper::isAvailable($subdomain, $project->id)) {
            return ['success' => false, 'message' => 'This subdomain is already taken.'];
        }

        $visibility = $arguments['visibility'] ?? 'public';

        if ($visibility === 'private' && ! $user->canUsePrivateVisibility()) {
            return ['success' => false, 'message' => "This project's plan does not include private visibility."];
        }

        $project->update([
            'subdomain' => $subdomain,
            'published_title' => $project->published_title ?? $project->name,
            'published_description' => $project->published_description ?? '',
            'published_visibility' => $visibility,
            'published_at' => $project->published_at ?? now(),
        ]);

        $baseDomain = SystemSetting::get('domain_base_domain', config('app.base_domain'));

        return [
            'success' => true,
            'subdomain' => $subdomain,
            'url' => $baseDomain ? "https://{$subdomain}.{$baseDomain}" : null,
        ];
    }
}
