<?php

namespace Database\Factories;

use App\Models\Subscription;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Transaction>
 */
class TransactionFactory extends Factory
{
    protected $model = Transaction::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'subscription_id' => null,
            'amount' => fake()->randomFloat(2, 9.99, 199.99),
            'currency' => 'USD',
            'status' => Transaction::STATUS_COMPLETED,
            'type' => Transaction::TYPE_SUBSCRIPTION_NEW,
            'payment_method' => fake()->randomElement([
                Transaction::PAYMENT_PAYPAL,
                Transaction::PAYMENT_BANK_TRANSFER,
                Transaction::PAYMENT_MANUAL,
            ]),
            'transaction_date' => now(),
        ];
    }

    /**
     * Indicate that the transaction is completed.
     */
    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Transaction::STATUS_COMPLETED,
        ]);
    }

    /**
     * Indicate that the transaction is pending.
     */
    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Transaction::STATUS_PENDING,
        ]);
    }

    /**
     * Indicate that the transaction failed.
     */
    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Transaction::STATUS_FAILED,
        ]);
    }

    /**
     * Indicate that the transaction was refunded.
     */
    public function refunded(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => Transaction::STATUS_REFUNDED,
        ]);
    }

    /**
     * Indicate a new subscription transaction.
     */
    public function newSubscription(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => Transaction::TYPE_SUBSCRIPTION_NEW,
        ]);
    }

    /**
     * Indicate a renewal transaction.
     */
    public function renewal(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => Transaction::TYPE_SUBSCRIPTION_RENEWAL,
        ]);
    }

    /**
     * Associate with a subscription.
     */
    public function forSubscription(Subscription $subscription): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => $subscription->user_id,
            'subscription_id' => $subscription->id,
            'amount' => $subscription->amount,
            'payment_method' => $subscription->payment_method,
        ]);
    }

    /**
     * Indicate a bank transfer transaction with instructions.
     */
    public function bankTransfer(): static
    {
        return $this->state(fn (array $attributes) => [
            'payment_method' => Transaction::PAYMENT_BANK_TRANSFER,
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
