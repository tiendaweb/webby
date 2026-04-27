<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Project>
 */
class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->words(3, true),
            'description' => fake()->sentence(),
            'thumbnail' => null,
            'is_public' => false,
            'is_starred' => false,
            'last_viewed_at' => now(),
            'uses_system_firebase' => true,
            'storage_used_bytes' => 0,
        ];
    }

    public function starred(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_starred' => true,
        ]);
    }

    public function public(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_public' => true,
        ]);
    }

    /**
     * Create a published project.
     */
    public function published(?string $subdomain = null): static
    {
        return $this->state(fn (array $attributes) => [
            'subdomain' => $subdomain ?? 'project-'.fake()->unique()->randomNumber(5),
            'published_title' => fake()->sentence(3),
            'published_description' => fake()->text(100),
            'published_visibility' => 'public',
            'published_at' => now(),
        ]);
    }

    /**
     * Create a private published project.
     */
    public function privatePublished(?string $subdomain = null): static
    {
        return $this->published($subdomain)->state(fn (array $attributes) => [
            'published_visibility' => 'private',
        ]);
    }

    /**
     * Set custom instructions.
     */
    public function withCustomInstructions(string $instructions): static
    {
        return $this->state(fn (array $attributes) => [
            'custom_instructions' => $instructions,
        ]);
    }

    /**
     * Set storage used bytes.
     */
    public function withStorageUsed(int $bytes): static
    {
        return $this->state(fn (array $attributes) => [
            'storage_used_bytes' => $bytes,
        ]);
    }

    /**
     * Set custom Firebase config.
     */
    public function withFirebaseConfig(array $config): static
    {
        return $this->state(fn (array $attributes) => [
            'firebase_config' => $config,
            'uses_system_firebase' => false,
        ]);
    }

    /**
     * Use system Firebase.
     */
    public function withSystemFirebase(): static
    {
        return $this->state(fn (array $attributes) => [
            'firebase_config' => null,
            'uses_system_firebase' => true,
        ]);
    }
}
