<?php

namespace Database\Factories;

use App\Models\AiProvider;
use App\Models\BuildCreditUsage;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\BuildCreditUsage>
 */
class BuildCreditUsageFactory extends Factory
{
    protected $model = BuildCreditUsage::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $promptTokens = fake()->numberBetween(100, 5000);
        $completionTokens = fake()->numberBetween(50, 2000);

        return [
            'user_id' => User::factory(),
            'project_id' => null,
            'ai_provider_id' => null,
            'model' => fake()->randomElement(['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-20250514']),
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'total_tokens' => $promptTokens + $completionTokens,
            'estimated_cost' => fake()->randomFloat(6, 0.001, 0.5),
            'action' => 'build',
        ];
    }

    /**
     * Associate usage with a project.
     */
    public function forProject(?Project $project = null): static
    {
        return $this->state(function (array $attributes) use ($project) {
            if ($project) {
                return [
                    'project_id' => $project->id,
                    'user_id' => $project->user_id,
                ];
            }

            return [
                'project_id' => Project::factory(),
            ];
        });
    }

    /**
     * Associate usage with an AI provider.
     */
    public function withProvider(?AiProvider $provider = null): static
    {
        return $this->state(fn (array $attributes) => [
            'ai_provider_id' => $provider?->id ?? AiProvider::factory(),
        ]);
    }

    /**
     * Set action to chat.
     */
    public function forChat(): static
    {
        return $this->state(fn (array $attributes) => [
            'action' => 'chat',
        ]);
    }

    /**
     * Set created_at to current month.
     */
    public function thisMonth(): static
    {
        return $this->state(fn (array $attributes) => [
            'created_at' => now()->startOfMonth()->addDays(fake()->numberBetween(0, max(0, now()->day - 1))),
        ]);
    }

    /**
     * Set created_at to last month.
     */
    public function lastMonth(): static
    {
        return $this->state(fn (array $attributes) => [
            'created_at' => now()->subMonth()->startOfMonth()->addDays(fake()->numberBetween(0, 27)),
        ]);
    }

    /**
     * Set specific token amounts.
     */
    public function withTokens(int $promptTokens, int $completionTokens): static
    {
        return $this->state(fn (array $attributes) => [
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'total_tokens' => $promptTokens + $completionTokens,
        ]);
    }

    /**
     * Indicate that the usage was with the user's own API key.
     */
    public function withOwnApiKey(): static
    {
        return $this->state(fn (array $attributes) => [
            'used_own_api_key' => true,
        ]);
    }

    /**
     * Indicate that the usage was with the plan's API.
     */
    public function withPlanApi(): static
    {
        return $this->state(fn (array $attributes) => [
            'used_own_api_key' => false,
        ]);
    }
}
