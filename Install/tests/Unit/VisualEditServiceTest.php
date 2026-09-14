<?php

namespace Tests\Unit;

use App\Models\Project;
use App\Services\ProjectWorkspaceService;
use App\Services\VisualEditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VisualEditServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_applies_unique_attribute_edit_to_blank_project_source(): void
    {
        Storage::fake('local');

        $project = Project::factory()->create([
            'type' => 'blank',
            'builder_id' => null,
        ]);

        app(ProjectWorkspaceService::class)->writeFile(
            $project,
            'index.html',
            '<!doctype html><html><body><img src="old.jpg" alt="Hero"></body></html>'
        );

        $result = app(VisualEditService::class)->apply($project, [
            'selector' => 'img',
            'tagName' => 'img',
            'field' => 'src',
            'originalValue' => 'old.jpg',
            'newValue' => 'new.jpg',
        ]);

        $this->assertTrue($result['success']);
        $this->assertSame('index.html', $result['sourcePath']);
        $this->assertStringContainsString(
            'src="new.jpg"',
            Storage::disk('local')->get("project-files/{$project->id}/index.html")
        );
    }

    public function test_it_returns_source_candidates_for_ambiguous_edits(): void
    {
        Storage::fake('local');

        $project = Project::factory()->create([
            'type' => 'blank',
            'builder_id' => null,
        ]);

        app(ProjectWorkspaceService::class)->writeFile($project, 'index.html', '<h1>Shared headline</h1>');
        app(ProjectWorkspaceService::class)->writeFile($project, 'about.html', '<h1>Shared headline</h1>');

        $result = app(VisualEditService::class)->apply($project, [
            'selector' => 'h1',
            'tagName' => 'h1',
            'field' => 'text',
            'originalValue' => 'Shared headline',
            'newValue' => 'Updated headline',
        ]);

        $this->assertFalse($result['success']);
        $this->assertTrue($result['needs_source_choice']);
        $this->assertCount(2, $result['candidates']);
    }

    public function test_it_replaces_relative_image_source_from_absolute_preview_url(): void
    {
        Storage::fake('local');

        $project = Project::factory()->create([
            'type' => 'blank',
            'builder_id' => null,
        ]);

        app(ProjectWorkspaceService::class)->writeFile(
            $project,
            'index.html',
            '<!doctype html><html><body><section><img src="./images/hero.jpg" alt="Hero"></section></body></html>'
        );

        $result = app(VisualEditService::class)->apply($project, [
            'selector' => 'section img',
            'tagName' => 'img',
            'field' => 'src',
            'originalValue' => url("/preview/{$project->id}/images/hero.jpg"),
            'originalValueAliases' => [
                "/preview/{$project->id}/images/hero.jpg",
                './images/hero.jpg',
            ],
            'newValue' => url("/api/files/{$project->id}/replacement.png"),
        ]);

        $this->assertTrue($result['success']);
        $this->assertStringContainsString(
            'src="'.url("/api/files/{$project->id}/replacement.png").'"',
            Storage::disk('local')->get("project-files/{$project->id}/index.html")
        );
    }
}
