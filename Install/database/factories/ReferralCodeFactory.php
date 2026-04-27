<?php

namespace Database\Factories;

use App\Models\ReferralCode;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ReferralCode>
 */
class ReferralCodeFactory extends Factory
{
    protected $model = ReferralCode::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'code' => strtoupper(Str::random(10)),
            'is_active' => true,
            'total_clicks' => $this->faker->numberBetween(0, 100),
            'total_signups' => $this->faker->numberBetween(0, 50),
            'total_conversions' => $this->faker->numberBetween(0, 20),
            'total_earnings' => $this->faker->randomFloat(2, 0, 500),
        ];
    }

    /**
     * Indicate that the referral code is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate fresh referral code with no stats.
     */
    public function fresh(): static
    {
        return $this->state(fn (array $attributes) => [
            'total_clicks' => 0,
            'total_signups' => 0,
            'total_conversions' => 0,
            'total_earnings' => 0,
        ]);
    }
}
