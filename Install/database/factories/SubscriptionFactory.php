<?php

namespace Database\Factories;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Subscription>
 */
class SubscriptionFactory extends Factory
{
    protected $model = Subscription::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'plan_id' => Plan::factory(),
            'status' => Subscription::STATUS_ACTIVE,
            'amount' => fake()->randomFloat(2, 9.99, 199.99),
            'payment_method' => fake()->randomElement([
                Subscription::PAYMENT_PAYPAL,
                Subscription::PAYMENT_BANK_TRANSFER,
                Subscription::PAYMENT_MANUAL,
            ]),
            'starts_at' => now(),
            'renewal_at' => now()->addMonth(),
        ];
    }

    /**
     * Indicate that the subscription is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Subscription::STATUS_ACTIVE,
            'starts_at' => now(),
            'renewal_at' => now()->addMonth(),
        ]);
    }

    /**
     * Indicate that the subscription is pending approval.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Subscription::STATUS_PENDING,
            'approved_at' => null,
            'starts_at' => null,
            'renewal_at' => null,
        ]);
    }

    /**
     * Indicate that the subscription is expired.
     */
    public function expired(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Subscription::STATUS_EXPIRED,
            'starts_at' => now()->subMonths(2),
            'ends_at' => now()->subMonth(),
            'renewal_at' => now()->subMonth(),
        ]);
    }

    /**
     * Indicate that the subscription is cancelled.
     */
    public function cancelled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Subscription::STATUS_CANCELLED,
            'cancelled_at' => now(),
        ]);
    }

    /**
     * Indicate that the subscription uses bank transfer.
     */
    public function bankTransfer(): static
    {
        return $this->state(fn (array $attributes) => [
            'payment_method' => Subscription::PAYMENT_BANK_TRANSFER,
        ]);
    }

    /**
     * Indicate a pending bank transfer subscription.
     */
    public function pendingBankTransfer(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Subscription::STATUS_PENDING,
            'payment_method' => Subscription::PAYMENT_BANK_TRANSFER,
            'approved_at' => null,
            'starts_at' => null,
            'renewal_at' => null,
            'metadata' => [
                'bank_transfer_instructions' => [
                    'bank_name' => 'Test Bank',
                    'account_number' => '1234567890',
                    'account_name' => 'Company Ltd',
                    'reference' => 'REF-'.fake()->unique()->randomNumber(6),
                ],
            ],
        ]);
    }
}
