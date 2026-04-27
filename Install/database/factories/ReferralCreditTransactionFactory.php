<?php

namespace Database\Factories;

use App\Models\Referral;
use App\Models\ReferralCreditTransaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ReferralCreditTransaction>
 */
class ReferralCreditTransactionFactory extends Factory
{
    protected $model = ReferralCreditTransaction::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $amount = $this->faker->randomFloat(2, 1, 100);

        return [
            'user_id' => User::factory(),
            'referral_id' => null,
            'amount' => $amount,
            'balance_after' => $amount,
            'type' => ReferralCreditTransaction::TYPE_PURCHASE_COMMISSION,
            'description' => 'Commission earned from referral',
            'metadata' => null,
        ];
    }

    /**
     * Create a signup bonus transaction.
     */
    public function signupBonus(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => ReferralCreditTransaction::TYPE_SIGNUP_BONUS,
            'description' => 'Signup bonus for referring a new user',
        ]);
    }

    /**
     * Create a purchase commission transaction.
     */
    public function purchaseCommission(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => ReferralCreditTransaction::TYPE_PURCHASE_COMMISSION,
            'referral_id' => Referral::factory(),
            'description' => 'Commission from referred user purchase',
        ]);
    }

    /**
     * Create a billing redemption transaction.
     */
    public function billingRedemption(): static
    {
        $amount = $this->faker->randomFloat(2, 5, 50);

        return $this->state(fn (array $attributes) => [
            'type' => ReferralCreditTransaction::TYPE_BILLING_REDEMPTION,
            'amount' => -$amount,
            'description' => 'Applied to subscription payment',
        ]);
    }

    /**
     * Create an admin adjustment transaction.
     */
    public function adminAdjustment(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => ReferralCreditTransaction::TYPE_ADMIN_ADJUSTMENT,
            'description' => 'Admin adjustment',
        ]);
    }

    /**
     * Create a refund clawback transaction.
     */
    public function refundClawback(): static
    {
        $amount = $this->faker->randomFloat(2, 1, 50);

        return $this->state(fn (array $attributes) => [
            'type' => ReferralCreditTransaction::TYPE_REFUND_CLAWBACK,
            'amount' => -$amount,
            'description' => 'Commission clawback due to refund',
        ]);
    }
}
