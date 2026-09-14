<?php

namespace App\Services\Mcp\Tools\Project;

use App\Services\Mcp\McpTool;

/**
 * Mirrors ProjectSettingsController::updateGeneral()'s field set and plan
 * gating (canUsePrivateVisibility).
 */
class ProjectSettingsUpdateGeneralTool extends McpTool
{
    public function name(): string
    {
        return 'project_settings_update_general';
    }

    public function description(): string
    {
        return "Update this project's name, published title/description, and publish visibility (public/private).";
    }

    public function requiredAbility(): ?string
    {
        return 'settings:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'name' => ['type' => 'string'],
                'published_title' => ['type' => 'string'],
                'published_description' => ['type' => 'string', 'description' => 'Max 150 characters.'],
                'published_visibility' => ['type' => 'string', 'enum' => ['public', 'private']],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $context['project'];
        $user = $project->user;

        $visibility = $arguments['published_visibility'] ?? $project->published_visibility ?? 'public';

        if ($visibility === 'private' && (! $user || ! $user->canUsePrivateVisibility())) {
            return ['success' => false, 'message' => "This project's plan does not include private visibility."];
        }

        $title = isset($arguments['published_title']) ? trim((string) $arguments['published_title']) : $project->published_title;
        $name = isset($arguments['name']) ? trim((string) $arguments['name']) : ($title ?: $project->name);

        $project->update([
            'name' => $name !== '' ? $name : $project->name,
            'published_title' => $title !== '' ? $title : null,
            'published_description' => array_key_exists('published_description', $arguments)
                ? mb_substr((string) $arguments['published_description'], 0, 150)
                : $project->published_description,
            'published_visibility' => $visibility,
        ]);

        return ['success' => true, 'message' => 'Settings updated.'];
    }
}
