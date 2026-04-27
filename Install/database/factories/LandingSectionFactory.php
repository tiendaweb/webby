<?php

namespace Database\Factories;

use App\Models\LandingSection;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\LandingSection>
 */
class LandingSectionFactory extends Factory
{
    protected $model = LandingSection::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'type' => $this->faker->unique()->randomElement([
                'hero', 'social_proof', 'features', 'product_showcase',
                'use_cases', 'pricing', 'categories', 'testimonials',
                'trusted_by', 'faq', 'cta',
            ]),
            'sort_order' => $this->faker->numberBetween(0, 10),
            'is_enabled' => true,
            'settings' => null,
        ];
    }

    /**
     * Create a hero section.
     */
    public function hero(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'hero',
        ]);
    }

    /**
     * Create a features section.
     */
    public function features(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'features',
            'settings' => ['layout' => 'bento', 'show_icons' => true],
        ]);
    }

    /**
     * Create a pricing section.
     */
    public function pricing(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'pricing',
        ]);
    }

    /**
     * Create a testimonials section.
     */
    public function testimonials(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'testimonials',
            'settings' => ['layout' => 'carousel', 'auto_rotate' => true],
        ]);
    }

    /**
     * Create a FAQ section.
     */
    public function faq(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'faq',
            'settings' => ['layout' => 'accordion'],
        ]);
    }

    /**
     * Create a CTA section.
     */
    public function cta(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => 'cta',
        ]);
    }

    /**
     * Create a disabled section.
     */
    public function disabled(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_enabled' => false,
        ]);
    }

    /**
     * Set custom settings.
     */
    public function withSettings(array $settings): static
    {
        return $this->state(fn (array $attributes) => [
            'settings' => $settings,
        ]);
    }

    /**
     * Set sort order.
     */
    public function sortOrder(int $order): static
    {
        return $this->state(fn (array $attributes) => [
            'sort_order' => $order,
        ]);
    }
}
