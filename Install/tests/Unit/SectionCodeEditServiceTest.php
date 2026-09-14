<?php

namespace Tests\Unit;

use App\Models\Project;
use App\Services\ProjectWorkspaceService;
use App\Services\SectionCodeEditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SectionCodeEditServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_resolves_and_saves_unique_section_code_for_blank_project(): void
    {
        Storage::fake('local');

        $project = Project::factory()->create([
            'type' => 'blank',
            'builder_id' => null,
        ]);

        $code = '<section class="hero"><h1>Hello</h1></section>';

        app(ProjectWorkspaceService::class)->writeFile(
            $project,
            'index.html',
            "<!doctype html><html><body>{$code}</body></html>"
        );

        $resolved = app(SectionCodeEditService::class)->resolve($project, [
            'selector' => 'section.hero',
            'tagName' => 'section',
            'outerHTML' => $code,
        ]);

        $this->assertTrue($resolved['success']);
        $this->assertSame('index.html', $resolved['sourcePath']);
        $this->assertSame($code, $resolved['code']);

        $saved = app(SectionCodeEditService::class)->save($project, [
            'sourcePath' => 'index.html',
            'originalCode' => $code,
            'newCode' => '<section class="hero"><h1>Updated</h1></section>',
        ]);

        $this->assertTrue($saved['success']);
        $this->assertStringContainsString(
            '<h1>Updated</h1>',
            Storage::disk('local')->get("project-files/{$project->id}/index.html")
        );
    }

    public function test_it_returns_candidates_for_ambiguous_section_code(): void
    {
        Storage::fake('local');

        $project = Project::factory()->create([
            'type' => 'blank',
            'builder_id' => null,
        ]);

        $code = '<section><p>Shared</p></section>';

        app(ProjectWorkspaceService::class)->writeFile($project, 'index.html', $code);
        app(ProjectWorkspaceService::class)->writeFile($project, 'about.html', $code);

        $resolved = app(SectionCodeEditService::class)->resolve($project, [
            'selector' => 'section',
            'tagName' => 'section',
            'outerHTML' => $code,
        ]);

        $this->assertFalse($resolved['success']);
        $this->assertTrue($resolved['needs_source_choice']);
        $this->assertCount(2, $resolved['candidates']);
    }

    public function test_it_resolves_structural_matches_when_html_differs_but_structure_is_safe(): void
    {
        Storage::fake('local');

        $project = Project::factory()->create([
            'type' => 'blank',
            'builder_id' => null,
        ]);

        $sourceCode = '<section class="hero main" id="hero"><h1>Hello</h1></section>';
        $renderedCode = '<section id="hero" class="main hero"><h1>Hello</h1></section>';

        app(ProjectWorkspaceService::class)->writeFile(
            $project,
            'index.html',
            "<!doctype html><html><body>{$sourceCode}</body></html>"
        );

        $resolved = app(SectionCodeEditService::class)->resolve($project, [
            'selector' => 'section#hero',
            'tagName' => 'section',
            'outerHTML' => $renderedCode,
        ]);

        $this->assertTrue($resolved['success']);
        $this->assertSame('index.html', $resolved['sourcePath']);
        $this->assertSame('structure', $resolved['matchType']);
        $this->assertGreaterThanOrEqual(80, $resolved['confidence']);
    }

    public function test_it_prioritizes_preview_path_in_ambiguous_results(): void
    {
        Storage::fake('local');

        $project = Project::factory()->create([
            'type' => 'blank',
            'builder_id' => null,
        ]);

        $code = '<section class="hero"><h1>Hello</h1></section>';

        app(ProjectWorkspaceService::class)->writeFile($project, 'index.html', $code);
        app(ProjectWorkspaceService::class)->writeFile($project, 'about.html', $code);

        $resolved = app(SectionCodeEditService::class)->resolve($project, [
            'selector' => 'section.hero',
            'tagName' => 'section',
            'outerHTML' => $code,
            'previewPath' => 'about.html',
        ]);

        $this->assertFalse($resolved['success']);
        $this->assertCount(2, $resolved['candidates']);
        $this->assertSame('about.html', $resolved['candidates'][0]['sourcePath']);
    }

    public function test_it_rejects_save_when_original_code_is_not_unique(): void
    {
        Storage::fake('local');

        $project = Project::factory()->create([
            'type' => 'blank',
            'builder_id' => null,
        ]);

        $code = '<section><p>Shared</p></section>';

        app(ProjectWorkspaceService::class)->writeFile($project, 'index.html', $code.$code);

        $this->expectException(\RuntimeException::class);

        app(SectionCodeEditService::class)->save($project, [
            'sourcePath' => 'index.html',
            'originalCode' => $code,
            'newCode' => '<section><p>Updated</p></section>',
        ]);
    }
}
