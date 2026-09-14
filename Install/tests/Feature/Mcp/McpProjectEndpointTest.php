<?php

namespace Tests\Feature\Mcp;

use App\Models\AiConnectorModule;
use App\Models\Project;
use App\Models\ProjectAiConnectorActivation;
use App\Models\ProjectAiConnectorToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class McpProjectEndpointTest extends TestCase
{
    use RefreshDatabase;

    private function activeConnector(?Project $project = null): array
    {
        $project ??= Project::factory()->create();
        $module = AiConnectorModule::create([
            'name' => 'Conector IA',
            'slug' => AiConnectorModule::SLUG_AI_CONNECTOR,
            'pricing_type' => AiConnectorModule::PRICING_MONTHLY,
            'price' => 10,
            'is_active' => true,
        ]);
        $activation = ProjectAiConnectorActivation::create([
            'project_id' => $project->id,
            'ai_connector_module_id' => $module->id,
            'user_id' => $project->user_id,
            'status' => ProjectAiConnectorActivation::STATUS_ACTIVE,
            'starts_at' => now(),
        ]);
        $issued = ProjectAiConnectorToken::issue($project, $activation, 'test-token', ['files:read']);

        return [$project, $activation, $issued['raw']];
    }

    public function test_request_without_a_token_is_rejected(): void
    {
        $project = Project::factory()->create();

        $response = $this->postJson("/api/mcp/project/{$project->id}", [
            'jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list',
        ]);

        $response->assertStatus(401);
    }

    public function test_a_valid_token_can_list_and_call_project_tools(): void
    {
        [$project, , $token] = $this->activeConnector();

        \Illuminate\Support\Facades\Storage::disk('local')->put(
            "project-files/{$project->id}/index.html",
            '<html>hi</html>'
        );

        $list = $this->withHeader('X-Connector-Token', $token)
            ->postJson("/api/mcp/project/{$project->id}", [
                'jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list',
            ]);
        $list->assertOk();
        $names = collect($list->json('result.tools'))->pluck('name')->all();
        $this->assertContains('project_files_list', $names);
        $this->assertContains('project_file_read', $names);

        $read = $this->withHeader('X-Connector-Token', $token)
            ->postJson("/api/mcp/project/{$project->id}", [
                'jsonrpc' => '2.0', 'id' => 2, 'method' => 'tools/call',
                'params' => ['name' => 'project_file_read', 'arguments' => ['path' => 'index.html']],
            ]);
        $read->assertOk();
        $payload = json_decode($read->json('result.content.0.text'), true);
        $this->assertTrue($payload['success']);
        $this->assertSame('<html>hi</html>', $payload['content']);
    }

    public function test_a_token_cannot_be_used_against_a_different_project(): void
    {
        [, , $token] = $this->activeConnector();
        $otherProject = Project::factory()->create();

        $response = $this->withHeader('X-Connector-Token', $token)
            ->postJson("/api/mcp/project/{$otherProject->id}", [
                'jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list',
            ]);

        $response->assertStatus(401);
    }

    public function test_a_revoked_token_is_rejected(): void
    {
        [$project, , $token] = $this->activeConnector();
        ProjectAiConnectorToken::where('project_id', $project->id)->update(['revoked_at' => now()]);

        $response = $this->withHeader('X-Connector-Token', $token)
            ->postJson("/api/mcp/project/{$project->id}", [
                'jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list',
            ]);

        $response->assertStatus(401);
    }

    public function test_a_token_whose_activation_is_no_longer_active_is_rejected(): void
    {
        [$project, $activation, $token] = $this->activeConnector();
        $activation->update(['status' => ProjectAiConnectorActivation::STATUS_CANCELLED]);

        $response = $this->withHeader('X-Connector-Token', $token)
            ->postJson("/api/mcp/project/{$project->id}", [
                'jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list',
            ]);

        $response->assertStatus(403);
        $response->assertJsonPath('error.code', -32001);
    }

    public function test_a_tool_call_without_the_required_scope_is_denied(): void
    {
        $project = Project::factory()->create();
        $module = AiConnectorModule::create([
            'name' => 'Conector IA',
            'slug' => AiConnectorModule::SLUG_AI_CONNECTOR,
            'pricing_type' => AiConnectorModule::PRICING_MONTHLY,
            'price' => 10,
            'is_active' => true,
        ]);
        $activation = ProjectAiConnectorActivation::create([
            'project_id' => $project->id,
            'ai_connector_module_id' => $module->id,
            'user_id' => $project->user_id,
            'status' => ProjectAiConnectorActivation::STATUS_ACTIVE,
            'starts_at' => now(),
        ]);
        $issued = ProjectAiConnectorToken::issue($project, $activation, 'no-scopes', []);

        $response = $this->withHeader('X-Connector-Token', $issued['raw'])
            ->postJson("/api/mcp/project/{$project->id}", [
                'jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/call',
                'params' => ['name' => 'project_files_list', 'arguments' => []],
            ]);

        $response->assertOk();
        $response->assertJsonPath('result.isError', true);
    }
}
