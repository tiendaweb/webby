<?php

namespace Database\Factories;

use App\Models\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    /**
     * Assign a specific plan to the user.
     */
    public function withPlan(Plan $plan): static
    {
        return $this->state(fn (array $attributes) => [
            'plan_id' => $plan->id,
            'build_credits' => $plan->getMonthlyBuildCredits(),
        ]);
    }

    /**
     * Set specific build credits for the user.
     */
    public function withBuildCredits(int $credits): static
    {
        return $this->state(fn (array $attributes) => [
            'build_credits' => $credits,
        ]);
    }

    /**
     * Create an admin user.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
        ]);
    }

    /**
     * Create a user with unlimited credits plan.
     */
    public function withUnlimitedCredits(): static
    {
        return $this->state(function (array $attributes) {
            $plan = Plan::factory()->unlimitedCredits()->create();

            return [
                'plan_id' => $plan->id,
                'build_credits' => 0, // Unlimited doesn't need credits stored
            ];
        });
    }
}
