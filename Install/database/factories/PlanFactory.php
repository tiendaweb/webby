<?php

namespace Database\Factories;

use App\Models\AiProvider;
use App\Models\Builder;
use App\Models\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Plan>
 */
class PlanFactory extends Factory
{
    protected $model = Plan::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->randomElement(['Free', 'Starter', 'Pro', 'Business', 'Enterprise']);

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->randomNumber(4),
            'description' => fake()->sentence(),
            'price' => fake()->randomFloat(2, 0, 199),
            'billing_period' => fake()->randomElement(['monthly', 'yearly']),
            'features' => [
                ['name' => 'Basic AI assistance', 'included' => true],
                ['name' => 'Community support', 'included' => true],
            ],
            'max_projects' => fake()->randomElement([3, 10, null]),
            'monthly_build_credits' => fake()->randomElement([100000, 500000, 1000000, -1]),
            'allow_user_ai_api_key' => false,
            'enable_subdomains' => false,
            'max_subdomains_per_user' => null,
            'allow_private_visibility' => false,
            'enable_custom_domains' => false,
            'max_custom_domains_per_user' => null,
            'enable_firebase' => false,
            'allow_user_firebase_config' => false,
            'enable_file_storage' => false,
            'max_storage_mb' => null,
            'max_file_size_mb' => 10,
            'allowed_file_types' => null,
            'is_active' => true,
            'is_popular' => false,
            'sort_order' => fake()->numberBetween(1, 10),
        ];
    }

    /**
     * Indicate that the plan is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate that the plan is free.
     */
    public function free(): static
    {
        return $this->state(fn (array $attributes) => [
            'name' => 'Free',
            'slug' => 'free',
            'price' => 0,
            'monthly_build_credits' => 10000,
        ]);
    }

    /**
     * Set specific build credits for the plan.
     */
    public function withBuildCredits(int $credits): static
    {
        return $this->state(fn (array $attributes) => [
            'monthly_build_credits' => $credits,
        ]);
    }

    /**
     * Create a plan with unlimited credits (-1).
     */
    public function unlimitedCredits(): static
    {
        return $this->state(fn (array $attributes) => [
            'monthly_build_credits' => -1,
        ]);
    }

    /**
     * Create a plan that allows users to use their own API key.
     */
    public function allowsOwnApiKey(): static
    {
        return $this->state(fn (array $attributes) => [
            'allow_user_ai_api_key' => true,
        ]);
    }

    /**
     * Create a yearly plan.
     */
    public function yearly(): static
    {
        return $this->state(fn (array $attributes) => [
            'billing_period' => 'yearly',
        ]);
    }

    /**
     * Set specific project limit for the plan.
     */
    public function withProjectLimit(int $limit): static
    {
        return $this->state(fn (array $attributes) => [
            'max_projects' => $limit,
        ]);
    }

    /**
     * Create a plan with unlimited projects.
     */
    public function unlimitedProjects(): static
    {
        return $this->state(fn (array $attributes) => [
            'max_projects' => null,
        ]);
    }

    /**
     * Enable subdomains with optional limit.
     */
    public function withSubdomains(?int $limit = null): static
    {
        return $this->state(fn (array $attributes) => [
            'enable_subdomains' => true,
            'max_subdomains_per_user' => $limit,
        ]);
    }

    /**
     * Enable unlimited subdomains.
     */
    public function unlimitedSubdomains(): static
    {
        return $this->withSubdomains(null);
    }

    /**
     * Enable custom domains with optional limit.
     */
    public function withCustomDomains(?int $limit = null): static
    {
        return $this->state(fn (array $attributes) => [
            'enable_custom_domains' => true,
            'max_custom_domains_per_user' => $limit,
        ]);
    }

    /**
     * Enable private visibility.
     */
    public function withPrivateVisibility(): static
    {
        return $this->state(fn (array $attributes) => [
            'allow_private_visibility' => true,
        ]);
    }

    /**
     * Enable Firebase with optional user config.
     */
    public function withFirebase(bool $allowUserConfig = false): static
    {
        return $this->state(fn (array $attributes) => [
            'enable_firebase' => true,
            'allow_user_firebase_config' => $allowUserConfig,
        ]);
    }

    /**
     * Enable file storage with optional limit.
     */
    public function withFileStorage(?int $maxStorageMb = null, int $maxFileSizeMb = 10): static
    {
        return $this->state(fn (array $attributes) => [
            'enable_file_storage' => true,
            'max_storage_mb' => $maxStorageMb,
            'max_file_size_mb' => $maxFileSizeMb,
            'allowed_file_types' => ['image/*', 'application/pdf'],
        ]);
    }

    /**
     * Enable unlimited file storage.
     */
    public function unlimitedStorage(): static
    {
        return $this->state(fn (array $attributes) => [
            'enable_file_storage' => true,
            'max_storage_mb' => null,
            'max_file_size_mb' => 50,
            'allowed_file_types' => null,
        ]);
    }

    /**
     * Assign an AI provider to the plan.
     */
    public function withAiProvider(AiProvider $provider): static
    {
        return $this->state(fn (array $attributes) => [
            'ai_provider_id' => $provider->id,
        ]);
    }

    /**
     * Assign a builder to the plan.
     */
    public function withBuilder(Builder $builder): static
    {
        return $this->state(fn (array $attributes) => [
            'builder_id' => $builder->id,
        ]);
    }
}
