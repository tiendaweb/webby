<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectFile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ProjectFile>
 */
class ProjectFileFactory extends Factory
{
    protected $model = ProjectFile::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $filename = fake()->uuid().'.jpg';

        return [
            'project_id' => Project::factory(),
            'filename' => $filename,
            'original_filename' => fake()->word().'.jpg',
            'path' => 'uploads/'.$filename,
            'mime_type' => 'image/jpeg',
            'size' => fake()->numberBetween(1000, 5000000),
            'source' => 'dashboard',
            'checksum' => fake()->sha256(),
        ];
    }

    /**
     * Set file source to app.
     */
    public function fromApp(): static
    {
        return $this->state(fn (array $attributes) => [
            'source' => 'app',
        ]);
    }

    /**
     * Create a PDF file.
     */
    public function pdf(): static
    {
        $filename = fake()->uuid().'.pdf';

        return $this->state(fn (array $attributes) => [
            'filename' => $filename,
            'original_filename' => fake()->word().'.pdf',
            'path' => 'uploads/'.$filename,
            'mime_type' => 'application/pdf',
        ]);
    }

    /**
     * Create an image file.
     */
    public function image(string $type = 'jpeg'): static
    {
        $extension = $type === 'jpeg' ? 'jpg' : $type;
        $filename = fake()->uuid().'.'.$extension;

        return $this->state(fn (array $attributes) => [
            'filename' => $filename,
            'original_filename' => fake()->word().'.'.$extension,
            'path' => 'uploads/'.$filename,
            'mime_type' => "image/{$type}",
        ]);
    }

    /**
     * Create a file with specific size.
     */
    public function withSize(int $sizeBytes): static
    {
        return $this->state(fn (array $attributes) => [
            'size' => $sizeBytes,
        ]);
    }

    /**
     * Create a large file (over 10MB).
     */
    public function large(): static
    {
        return $this->withSize(15 * 1024 * 1024); // 15 MB
    }

    /**
     * Create a video file.
     */
    public function video(): static
    {
        $filename = fake()->uuid().'.mp4';

        return $this->state(fn (array $attributes) => [
            'filename' => $filename,
            'original_filename' => fake()->word().'.mp4',
            'path' => 'uploads/'.$filename,
            'mime_type' => 'video/mp4',
            'size' => fake()->numberBetween(5000000, 50000000),
        ]);
    }

    /**
     * Create an audio file.
     */
    public function audio(): static
    {
        $filename = fake()->uuid().'.mp3';

        return $this->state(fn (array $attributes) => [
            'filename' => $filename,
            'original_filename' => fake()->word().'.mp3',
            'path' => 'uploads/'.$filename,
            'mime_type' => 'audio/mpeg',
            'size' => fake()->numberBetween(1000000, 10000000),
        ]);
    }
}
