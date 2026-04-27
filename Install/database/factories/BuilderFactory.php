<?php

namespace Database\Factories;

use App\Models\Builder;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Builder>
 */
class BuilderFactory extends Factory
{
    protected $model = Builder::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->randomElement(['Builder', 'Server', 'Node']).' '.fake()->numberBetween(1, 10),
            'url' => 'https://builder-'.fake()->numberBetween(1, 100).'.example.com',
            'port' => fake()->randomElement([8080, 8081, 8082, 3000, 3001]),
            'server_key' => Str::random(32),
            'status' => 'active',
            'max_iterations' => fake()->randomElement([20, 25, 30, 50]),
            'last_triggered_at' => fake()->optional(0.5)->dateTimeBetween('-1 week', 'now'),
        ];
    }

    /**
     * Indicate that the builder is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'inactive',
        ]);
    }

    /**
     * Indicate that the builder has never been triggered.
     */
    public function neverTriggered(): static
    {
        return $this->state(fn (array $attributes) => [
            'last_triggered_at' => null,
        ]);
    }
}
