<?php

namespace Database\Factories;

use App\Models\AiProvider;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\AiProvider>
 */
class AiProviderFactory extends Factory
{
    protected $model = AiProvider::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = fake()->randomElement([
            AiProvider::TYPE_OPENAI,
            AiProvider::TYPE_ANTHROPIC,
        ]);

        return [
            'name' => fake()->company().' AI',
            'type' => $type,
            'credentials' => [
                'api_key' => 'test-api-key-'.fake()->uuid(),
            ],
            'config' => [
                'base_url' => AiProvider::DEFAULT_BASE_URLS[$type] ?? null,
                'default_model' => AiProvider::DEFAULT_MODELS[$type][0] ?? null,
                'max_tokens' => 8192,
                'summarizer_max_tokens' => 1500,
            ],
            'available_models' => AiProvider::DEFAULT_MODELS[$type] ?? [],
            'status' => 'active',
            'is_default' => false,
            'total_requests' => 0,
        ];
    }

    /**
     * Indicate that the provider is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'inactive',
        ]);
    }

    /**
     * Indicate that the provider is the default.
     */
    public function default(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_default' => true,
        ]);
    }

    /**
     * Create an OpenAI provider.
     */
    public function openai(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'OpenAI',
            'type' => AiProvider::TYPE_OPENAI,
            'config' => [
                'base_url' => AiProvider::DEFAULT_BASE_URLS[AiProvider::TYPE_OPENAI],
                'default_model' => 'gpt-4o',
                'max_tokens' => 8192,
                'summarizer_max_tokens' => 1500,
            ],
            'available_models' => AiProvider::DEFAULT_MODELS[AiProvider::TYPE_OPENAI],
        ]);
    }

    /**
     * Create an Anthropic provider.
     */
    public function anthropic(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Anthropic',
            'type' => AiProvider::TYPE_ANTHROPIC,
            'config' => [
                'base_url' => AiProvider::DEFAULT_BASE_URLS[AiProvider::TYPE_ANTHROPIC],
                'default_model' => 'claude-sonnet-4-5',
                'max_tokens' => 8192,
                'summarizer_max_tokens' => 1500,
            ],
            'available_models' => AiProvider::DEFAULT_MODELS[AiProvider::TYPE_ANTHROPIC],
        ]);
    }

    /**
     * Create a ZhipuAI provider.
     */
    public function zhipu(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'ZhipuAI',
            'type' => AiProvider::TYPE_ZHIPU,
            'config' => [
                'base_url' => AiProvider::DEFAULT_BASE_URLS[AiProvider::TYPE_ZHIPU],
                'default_model' => 'glm-5',
                'max_tokens' => 8192,
                'summarizer_max_tokens' => 1500,
            ],
            'available_models' => AiProvider::DEFAULT_MODELS[AiProvider::TYPE_ZHIPU],
        ]);
    }
}
