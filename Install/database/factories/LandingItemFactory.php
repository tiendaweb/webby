<?php

namespace Database\Factories;

use App\Models\LandingItem;
use App\Models\LandingSection;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\LandingItem>
 */
class LandingItemFactory extends Factory
{
    protected $model = LandingItem::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'section_id' => LandingSection::factory(),
            'locale' => 'en',
            'item_key' => Str::uuid()->toString(),
            'sort_order' => $this->faker->numberBetween(0, 10),
            'is_enabled' => true,
            'data' => [
                'title' => $this->faker->sentence(3),
                'description' => $this->faker->paragraph(),
            ],
        ];
    }

    /**
     * Set the section.
     */
    public function forSection(LandingSection $section): static
    {
        return $this->state(fn (array $attributes) => [
            'section_id' => $section->id,
        ]);
    }

    /**
     * Set the locale.
     */
    public function locale(string $locale): static
    {
        return $this->state(fn (array $attributes) => [
            'locale' => $locale,
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

    /**
     * Create a disabled item.
     */
    public function disabled(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_enabled' => false,
        ]);
    }

    /**
     * Create a feature item.
     */
    public function feature(array $overrides = []): static
    {
        return $this->state(fn (array $attributes) => [
            'data' => array_merge([
                'title' => $this->faker->sentence(3),
                'description' => $this->faker->paragraph(),
                'icon' => $this->faker->randomElement(['Sparkles', 'Zap', 'Rocket', 'Star']),
                'size' => $this->faker->randomElement(['large', 'medium', 'small']),
            ], $overrides),
        ]);
    }

    /**
     * Create a persona/use case item.
     */
    public function persona(array $overrides = []): static
    {
        return $this->state(fn (array $attributes) => [
            'data' => array_merge([
                'title' => $this->faker->jobTitle(),
                'description' => $this->faker->paragraph(),
                'icon' => $this->faker->randomElement(['User', 'Code', 'Palette', 'Briefcase']),
            ], $overrides),
        ]);
    }

    /**
     * Create a category item.
     */
    public function category(array $overrides = []): static
    {
        return $this->state(fn (array $attributes) => [
            'data' => array_merge([
                'name' => $this->faker->words(2, true),
                'icon' => $this->faker->randomElement(['Layout', 'BarChart', 'ShoppingCart', 'Monitor']),
            ], $overrides),
        ]);
    }

    /**
     * Create a testimonial item.
     */
    public function testimonial(array $overrides = []): static
    {
        return $this->state(fn (array $attributes) => [
            'data' => array_merge([
                'quote' => $this->faker->paragraph(),
                'author' => $this->faker->name(),
                'role' => $this->faker->jobTitle().' at '.$this->faker->company(),
                'avatar' => null,
                'rating' => $this->faker->numberBetween(4, 5),
            ], $overrides),
        ]);
    }

    /**
     * Create a FAQ item.
     */
    public function faq(array $overrides = []): static
    {
        return $this->state(fn (array $attributes) => [
            'data' => array_merge([
                'question' => $this->faker->sentence().'?',
                'answer' => $this->faker->paragraphs(2, true),
            ], $overrides),
        ]);
    }

    /**
     * Create a logo/trusted by item.
     */
    public function logo(array $overrides = []): static
    {
        $company = $this->faker->company();

        return $this->state(fn (array $attributes) => [
            'data' => array_merge([
                'name' => $company,
                'initial' => strtoupper(substr($company, 0, 1)),
                'color' => $this->faker->randomElement([
                    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
                ]),
            ], $overrides),
        ]);
    }
}
