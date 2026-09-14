<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\User;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;

/**
 * Configure any project: rename, re-describe, restyle, change published
 * metadata, or transfer ownership to another account. Only keys actually
 * present in the arguments are written, so a partial update never blanks a
 * field the caller did not mention.
 */
class AdminProjectsUpdateTool extends McpTool
{
    use ResolvesAdminTargets;

    public function name(): string
    {
        return 'admin_projects_update';
    }

    public function description(): string
    {
        return 'Update/configure any project by id or subdomain: name, description, custom AI instructions, theme preset, visibility, published metadata, or transfer it to another owner. Only the fields you pass are changed.';
    }

    public function requiredAbility(): ?string
    {
        return 'projects:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.'],
                'name' => ['type' => 'string', 'maxLength' => 255],
                'description' => ['type' => 'string', 'maxLength' => 1000],
                'custom_instructions' => ['type' => 'string'],
                'theme_preset' => ['type' => 'string'],
                'is_public' => ['type' => 'boolean'],
                'is_starred' => ['type' => 'boolean'],
                'published_title' => ['type' => 'string'],
                'published_description' => ['type' => 'string'],
                'published_visibility' => ['type' => 'string', 'enum' => ['public', 'private']],
                'transfer_to_user_id' => ['type' => ['integer', 'string'], 'description' => 'Move the project to another account.'],
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

        $updates = [];

        foreach (['name', 'description', 'custom_instructions', 'theme_preset', 'published_title', 'published_description'] as $field) {
            if (array_key_exists($field, $arguments)) {
                $updates[$field] = $arguments[$field];
            }
        }

        foreach (['is_public', 'is_starred'] as $flag) {
            if (array_key_exists($flag, $arguments)) {
                $updates[$flag] = (bool) $arguments[$flag];
            }
        }

        if (array_key_exists('published_visibility', $arguments)) {
            $visibility = $arguments['published_visibility'];

            if (! in_array($visibility, ['public', 'private'], true)) {
                return ['success' => false, 'message' => 'published_visibility must be "public" or "private".'];
            }

            $updates['published_visibility'] = $visibility;
        }

        if (! empty($arguments['transfer_to_user_id'])) {
            $newOwner = User::find($arguments['transfer_to_user_id']);

            if (! $newOwner) {
                return ['success' => false, 'message' => "Target user not found: {$arguments['transfer_to_user_id']}"];
            }

            $updates['user_id'] = $newOwner->id;
        }

        if ($updates === []) {
            return ['success' => false, 'message' => 'Nothing to update — pass at least one field besides project_id.'];
        }

        $project->update($updates);
        $project->refresh();

        return [
            'success' => true,
            'updated_fields' => array_keys($updates),
            'project' => $this->projectSummary($project),
        ];
    }
}
