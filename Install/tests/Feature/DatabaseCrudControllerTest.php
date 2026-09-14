<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DatabaseCrudControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_returns_detected_connections_and_tables(): void
    {
        Schema::create('widgets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
        });

        $user = User::factory()->admin()->create([
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($user)->getJson(route('database.crud.index', [
            'connection' => 'sqlite',
        ]));

        $response->assertOk();
        $response->assertJsonPath('connection.status', 'ready');
        $response->assertJsonFragment(['name' => 'widgets']);
        $this->assertNotEmpty($response->json('connections'));
    }

    public function test_non_admin_users_cannot_access_database_editor_api(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)
            ->getJson(route('database.crud.index'))
            ->assertForbidden();
    }

    public function test_protected_tables_block_schema_changes(): void
    {
        $user = User::factory()->admin()->create([
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)
            ->postJson(route('database.crud.columns.create', [
                'table' => 'users',
                'connection' => 'sqlite',
            ]), [
                'name' => 'unsafe_column',
                'type' => 'text',
            ])
            ->assertStatus(423);
    }

    public function test_protected_table_rows_require_explicit_confirmation(): void
    {
        $user = User::factory()->admin()->create([
            'email_verified_at' => now(),
            'name' => 'Original Name',
        ]);

        $route = route('database.crud.rows.update', [
            'table' => 'users',
            'rowKey' => $user->id,
            'connection' => 'sqlite',
        ]);

        $this->actingAs($user)
            ->putJson($route, [
                'values' => ['name' => 'Blocked Name'],
            ])
            ->assertStatus(423);

        $this->actingAs($user)
            ->putJson($route, [
                'values' => ['name' => 'Confirmed Name'],
                'confirm_protected' => true,
            ])
            ->assertOk();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Confirmed Name',
        ]);
    }
}
