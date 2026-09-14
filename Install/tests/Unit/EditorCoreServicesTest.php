<?php

namespace Tests\Unit;

use App\Models\Project;
use App\Services\ProjectRevisionService;
use App\Services\ProjectSeoService;
use App\Services\ProjectStructureService;
use App\Services\ProjectWorkspaceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EditorCoreServicesTest extends TestCase
{
    use RefreshDatabase;

    public function test_revision_service_restores_a_blank_project_workspace(): void
    {
        Storage::fake('local');

        $project = Project::factory()->create([
            'type' => 'blank',
            'builder_id' => null,
        ]);

        app(ProjectWorkspaceService::class)->writeFile($project, 'index.html', '<h1>Stable</h1>');

        $revision = app(ProjectRevisionService::class)->create($project, $project->user, 'manual', 'Stable checkpoint');

        app(ProjectWorkspaceService::class)->writeFile($project, 'index.html', '<h1>Broken</h1>');

        $result = app(ProjectRevisionService::class)->restore($revision);

        $this->assertTrue($result['success']);
        $this->assertStringContainsString(
            '<h1>Stable</h1>',
            Storage::disk('local')->get("project-files/{$project->id}/index.html")
        );
    }

    public function test_structure_service_can_rename_and_duplicate_sections(): void
    {
        Storage::fake('local');

        $project = Project::factory()->create([
            'type' => 'blank',
            'builder_id' => null,
        ]);

        app(ProjectWorkspaceService::class)->writeFile(
            $project,
            'index.html',
            '<!doctype html><html><body><section><h2>Hero</h2></section></body></html>'
        );

        $service = app(ProjectStructureService::class);
        $node = $service->structure($project)['pages'][0]['sections'][0];

        $service->applyAction($project, [
            'sourcePath' => 'index.html',
            'nodeId' => $node['id'],
            'action' => 'rename',
            'label' => 'Hero principal',
        ]);

        $node = $service->structure($project)['pages'][0]['sections'][0];
        $service->applyAction($project, [
            'sourcePath' => 'index.html',
            'nodeId' => $node['id'],
            'action' => 'duplicate',
        ]);

        $content = Storage::disk('local')->get("project-files/{$project->id}/index.html");

        $this->assertStringContainsString('data-webby-label="Hero principal"', $content);
        $this->assertSame(2, substr_count($content, '<section'));
    }

    public function test_seo_service_applies_page_settings_and_reports_audit(): void
    {
        Storage::fake('local');

        $project = Project::factory()->create([
            'type' => 'blank',
            'builder_id' => null,
            'name' => 'Demo Site',
        ]);

        app(ProjectWorkspaceService::class)->writeFile(
            $project,
            'index.html',
            '<!doctype html><html><head></head><body><section><img src="hero.jpg"></section></body></html>'
        );

        $service = app(ProjectSeoService::class);
        $saved = $service->save($project, [
            'page_path' => 'index.html',
            'title' => 'Demo SEO',
            'description' => 'A concise SEO description.',
            'slug' => '/',
            'indexable' => true,
        ]);

        $content = Storage::disk('local')->get("project-files/{$project->id}/index.html");

        $this->assertTrue($saved['success']);
        $this->assertStringContainsString('<title>Demo SEO</title>', $content);
        $this->assertStringContainsString('name="description"', $content);
        $this->assertGreaterThanOrEqual(1, $service->audit($project)['summary']['warnings']);
    }
}
