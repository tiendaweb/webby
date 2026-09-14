<?php

namespace Tests\Feature;

use App\Models\Template;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreateTemplateRecommendationTest extends TestCase
{
    use RefreshDatabase;

    public function test_template_recommendations_endpoint_returns_ranked_templates(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $saasTemplate = Template::factory()->create([
            'slug' => 'saas',
            'name' => 'SaaS Landing',
            'category' => 'saas',
            'is_system' => true,
            'keywords' => ['saas', 'startup', 'pricing'],
        ]);

        Template::factory()->create([
            'slug' => 'default',
            'name' => 'Default',
            'category' => 'system',
            'is_system' => true,
        ]);

        $response = $this->actingAs($user)->postJson(route('create.template-recommendations'), [
            'prompt' => 'Build a SaaS landing page for my startup',
        ]);

        $response->assertOk()
            ->assertJsonPath('category', 'saas')
            ->assertJsonPath('theme_preset', 'midnight')
            ->assertJsonPath('templates.0.id', $saasTemplate->id);
    }
}
