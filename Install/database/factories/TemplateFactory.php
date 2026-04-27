<?php

namespace Database\Factories;

use App\Models\Plan;
use App\Models\Template;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Collection;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Template>
 */
class TemplateFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->words(2, true),
            'description' => fake()->sentence(),
            'thumbnail' => null,
            'category' => fake()->randomElement(['web', 'mobile', 'dashboard', 'landing']),
            'is_system' => false,
        ];
    }

    /**
     * Assign the template to specified plans after creation.
     *
     * @param  Plan|Collection|array  $plans
     */
    public function withPlans($plans): static
    {
        return $this->afterCreating(function (Template $template) use ($plans) {
            $planIds = $plans instanceof Collection
                ? $plans->pluck('id')
                : collect($plans)->pluck('id');

            $template->plans()->attach($planIds);
        });
    }
}
