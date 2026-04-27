<?php

namespace Database\Factories;

use App\Models\Referral;
use App\Models\ReferralCode;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Referral>
 */
class ReferralFactory extends Factory
{
    protected $model = Referral::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'referrer_id' => User::factory(),
            'referee_id' => User::factory(),
            'referral_code_id' => ReferralCode::factory(),
            'status' => Referral::STATUS_PENDING,
            'ip_address' => $this->faker->ipv4,
            'user_agent' => $this->faker->userAgent,
            'converted_at' => null,
            'credited_at' => null,
            'transaction_id' => null,
            'commission_amount' => null,
        ];
    }

    /**
     * Indicate that the referral has been converted.
     */
    public function converted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Referral::STATUS_CONVERTED,
            'converted_at' => now(),
            'transaction_id' => Transaction::factory(),
            'commission_amount' => $this->faker->randomFloat(2, 1, 50),
        ]);
    }

    /**
     * Indicate that the referral has been credited.
     */
    public function credited(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Referral::STATUS_CREDITED,
            'converted_at' => now()->subHour(),
            'credited_at' => now(),
            'transaction_id' => Transaction::factory(),
            'commission_amount' => $this->faker->randomFloat(2, 1, 50),
        ]);
    }

    /**
     * Indicate that the referral is invalid.
     */
    public function invalid(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Referral::STATUS_INVALID,
        ]);
    }

    /**
     * Configure referral with specific referrer and their code.
     */
    public function forReferrer(User $referrer): static
    {
        return $this->state(fn (array $attributes) => [
            'referrer_id' => $referrer->id,
            'referral_code_id' => $referrer->referralCode?->id ?? ReferralCode::factory()->create(['user_id' => $referrer->id])->id,
        ]);
    }
}
