<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Mcp\McpTool;

class ProjectSettingsGetTool extends McpTool
{
    public function name(): string
    {
        return 'project_settings_get';
    }

    public function description(): string
    {
        return 'Get this project\'s general settings: name, publish visibility, custom domain/subdomain, and knowledge/custom instructions.';
    }

    public function requiredAbility(): ?string
    {
        return 'settings:read';
    }

    public function inputSchema(): array
    {
        return ['type' => 'object', 'properties' => new \stdClass];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];

        return [
            'success' => true,
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'custom_instructions' => $project->custom_instructions,
                'subdomain' => $project->subdomain,
                'custom_domain' => $project->custom_domain,
                'custom_domain_verified' => $project->custom_domain_verified,
                'published_title' => $project->published_title,
                'published_description' => $project->published_description,
                'published_visibility' => $project->published_visibility,
                'published_at' => $project->published_at?->toIso8601String(),
                'theme_preset' => $project->theme_preset,
            ],
        ];
    }
}
