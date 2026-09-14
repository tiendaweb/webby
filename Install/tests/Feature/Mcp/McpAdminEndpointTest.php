<?php

namespace Tests\Feature\Mcp;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class McpAdminEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_initialize_requires_an_admin(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/mcp/admin', [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'initialize',
        ]);

        $response->assertStatus(401);
        $response->assertJsonPath('error.code', -32001);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->postJson('/api/mcp/admin', [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'initialize',
        ]);

        $response->assertStatus(401);
    }

    public function test_initialize_and_tools_list_for_an_admin(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin, ['users:read']);

        $init = $this->postJson('/api/mcp/admin', [
            'jsonrpc' => '2.0',
            'id' => 1,
            'method' => 'initialize',
        ]);
        $init->assertOk();
        $init->assertJsonPath('result.serverInfo.name', 'webby-mcp-admin');

        $list = $this->postJson('/api/mcp/admin', [
            'jsonrpc' => '2.0',
            'id' => 2,
            'method' => 'tools/list',
        ]);
        $list->assertOk();
        $names = collect($list->json('result.tools'))->pluck('name')->all();
        $this->assertContains('admin_users_list', $names);
        $this->assertContains('admin_users_impersonate', $names);
        $this->assertContains('admin_database_query', $names);
    }

    public function test_tools_call_succeeds_with_the_required_ability(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->count(2)->create();
        Sanctum::actingAs($admin, ['users:read']);

        $response = $this->postJson('/api/mcp/admin', [
            'jsonrpc' => '2.0',
            'id' => 3,
            'method' => 'tools/call',
            'params' => ['name' => 'admin_users_list', 'arguments' => ['per_page' => 10]],
        ]);

        $response->assertOk();
        $response->assertJsonPath('result.isError', false);
        $payload = json_decode($response->json('result.content.0.text'), true);
        $this->assertTrue($payload['success']);
        $this->assertGreaterThanOrEqual(3, $payload['pagination']['total']);
    }

    public function test_tools_call_is_denied_without_the_required_ability(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin, ['users:read']); // no database:execute

        $response = $this->postJson('/api/mcp/admin', [
            'jsonrpc' => '2.0',
            'id' => 4,
            'method' => 'tools/call',
            'params' => ['name' => 'admin_database_query', 'arguments' => ['sql' => 'SELECT 1']],
        ]);

        $response->assertOk();
        $response->assertJsonPath('result.isError', true);
        $payload = json_decode($response->json('result.content.0.text'), true);
        $this->assertFalse($payload['success']);
        $this->assertStringContainsString('database:execute', $payload['message']);
    }

    public function test_admin_database_query_blocks_protected_tables(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin, ['database:execute']);

        $response = $this->postJson('/api/mcp/admin', [
            'jsonrpc' => '2.0',
            'id' => 5,
            'method' => 'tools/call',
            'params' => ['name' => 'admin_database_query', 'arguments' => ['sql' => "DELETE FROM users WHERE id = 999999"]],
        ]);

        $response->assertOk();
        $payload = json_decode($response->json('result.content.0.text'), true);
        $this->assertFalse($payload['success']);
        $this->assertStringContainsString('protected system table', $payload['message']);
    }

    public function test_unknown_tool_returns_a_json_rpc_error(): void
    {
        $admin = User::factory()->admin()->create();
        Sanctum::actingAs($admin, ['*']);

        $response = $this->postJson('/api/mcp/admin', [
            'jsonrpc' => '2.0',
            'id' => 6,
            'method' => 'tools/call',
            'params' => ['name' => 'does_not_exist', 'arguments' => []],
        ]);

        $response->assertOk();
        $response->assertJsonPath('error.code', -32602);
    }
}
