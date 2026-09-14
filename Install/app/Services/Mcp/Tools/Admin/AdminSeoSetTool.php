<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\User;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\Concerns\SnapshotsWorkspace;
use App\Services\Mcp\McpTool;
use App\Services\ProjectSeoService;
use RuntimeException;

class AdminSeoSetTool extends McpTool
{
    use ResolvesAdminTargets;
    use SnapshotsWorkspace;

    public function __construct(protected ProjectSeoService $seo) {}

    public function name(): string
    {
        return 'admin_seo_set';
    }

    public function description(): string
    {
        return 'Set the SEO settings of one page of a project. Only the fields you send are changed. '
            .'Run admin_seo_audit afterwards to see whether anything is still missing.';
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
                'page_path' => ['type' => 'string', 'maxLength' => 500, 'description' => 'Page this applies to, e.g. "index.html".'],
                'title' => ['type' => 'string', 'maxLength' => 255],
                'description' => ['type' => 'string', 'maxLength' => 180, 'description' => 'Meta description. Search engines cut it around 160 characters.'],
                'slug' => ['type' => 'string', 'maxLength' => 180],
                'canonical_url' => ['type' => 'string', 'maxLength' => 255],
                'social_image' => ['type' => 'string', 'maxLength' => 255, 'description' => 'Path or URL of the Open Graph image.'],
                'favicon' => ['type' => 'string', 'maxLength' => 255],
                'indexable' => ['type' => 'boolean', 'description' => 'false adds noindex — the page stays online but drops out of search results.'],
            ],
            'required' => ['project_id', 'page_path'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $this->resolveProject($arguments);

        $datos = array_intersect_key($arguments, array_flip([
            'page_path', 'title', 'description', 'slug', 'canonical_url', 'social_image', 'favicon', 'indexable',
        ]));

        if (isset($datos['description']) && mb_strlen((string) $datos['description']) > 180) {
            throw new RuntimeException('The description must be 180 characters or fewer.');
        }

        $revision = $this->snapshotBeforeWrite(
            $project,
            $context instanceof User ? $context : null,
            'Antes de actualizar SEO',
            ['tool' => $this->name(), 'page_path' => $datos['page_path']],
        );

        return ['success' => true, 'revision_id' => $revision] + $this->seo->save($project, $datos);
    }
}
