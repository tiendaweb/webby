<?php

namespace Database\Factories;

use App\Models\LandingContent;
use App\Models\LandingSection;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\LandingContent>
 */
class LandingContentFactory extends Factory
{
    protected $model = LandingContent::class;

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
            'field' => 'title',
            'value' => $this->faker->sentence(),
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
     * Set a specific field and value.
     */
    public function field(string $field, mixed $value): static
    {
        return $this->state(fn (array $attributes) => [
            'field' => $field,
            'value' => $value,
        ]);
    }

    /**
     * Create a title field.
     */
    public function title(?string $value = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field' => 'title',
            'value' => $value ?? $this->faker->sentence(),
        ]);
    }

    /**
     * Create a subtitle field.
     */
    public function subtitle(?string $value = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field' => 'subtitle',
            'value' => $value ?? $this->faker->paragraph(),
        ]);
    }

    /**
     * Create headlines field with array value.
     */
    public function headlines(?array $values = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field' => 'headlines',
            'value' => $values ?? [
                $this->faker->sentence(),
                $this->faker->sentence(),
                $this->faker->sentence(),
            ],
        ]);
    }

    /**
     * Create subtitles field with array value.
     */
    public function subtitles(?array $values = null): static
    {
        return $this->state(fn (array $attributes) => [
            'field' => 'subtitles',
            'value' => $values ?? [
                $this->faker->paragraph(),
                $this->faker->paragraph(),
            ],
        ]);
    }
}
