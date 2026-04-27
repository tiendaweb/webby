<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\UserNotification>
 */
class UserNotificationFactory extends Factory
{
    protected $model = UserNotification::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $types = [
            UserNotification::TYPE_CREDITS_LOW,
            UserNotification::TYPE_SUBSCRIPTION_RENEWED,
            UserNotification::TYPE_SUBSCRIPTION_EXPIRED,
            UserNotification::TYPE_PAYMENT_COMPLETED,
            UserNotification::TYPE_DOMAIN_VERIFIED,
            UserNotification::TYPE_SSL_PROVISIONED,
        ];

        return [
            'user_id' => User::factory(),
            'type' => fake()->randomElement($types),
            'title' => fake()->sentence(3),
            'message' => fake()->sentence(10),
            'data' => null,
            'action_url' => fake()->optional()->url(),
            'read_at' => null,
        ];
    }

    /**
     * Mark the notification as unread.
     */
    public function unread(): static
    {
        return $this->state(fn (array $attributes) => [
            'read_at' => null,
        ]);
    }

    /**
     * Mark the notification as read.
     */
    public function read(): static
    {
        return $this->state(fn (array $attributes) => [
            'read_at' => now()->subMinutes(fake()->numberBetween(1, 60)),
        ]);
    }

    /**
     * Set notification type to build_complete.
     */
    public function buildComplete(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => UserNotification::TYPE_BUILD_COMPLETE,
            'title' => 'Build Complete',
            'message' => 'Your project has been built successfully.',
            'data' => ['project_id' => fake()->uuid()],
        ]);
    }

    /**
     * Set notification type to build_failed.
     */
    public function buildFailed(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => UserNotification::TYPE_BUILD_FAILED,
            'title' => 'Build Failed',
            'message' => 'Your project build has failed.',
            'data' => ['project_id' => fake()->uuid()],
        ]);
    }

    /**
     * Set notification type to credits_low.
     */
    public function creditsLow(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => UserNotification::TYPE_CREDITS_LOW,
            'title' => 'Credits Running Low',
            'message' => 'You have less than 20% of your monthly credits remaining.',
            'action_url' => '/billing',
        ]);
    }

    /**
     * Set notification type to subscription_renewed.
     */
    public function subscriptionRenewed(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => UserNotification::TYPE_SUBSCRIPTION_RENEWED,
            'title' => 'Subscription Renewed',
            'message' => 'Your subscription has been renewed successfully.',
        ]);
    }

    /**
     * Set notification type to subscription_expired.
     */
    public function subscriptionExpired(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => UserNotification::TYPE_SUBSCRIPTION_EXPIRED,
            'title' => 'Subscription Expired',
            'message' => 'Your subscription has expired.',
        ]);
    }

    /**
     * Set notification type to payment_completed.
     */
    public function paymentCompleted(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => UserNotification::TYPE_PAYMENT_COMPLETED,
            'title' => 'Payment Completed',
            'message' => 'Your payment has been processed successfully.',
        ]);
    }

    /**
     * Set notification type to domain_verified.
     */
    public function domainVerified(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => UserNotification::TYPE_DOMAIN_VERIFIED,
            'title' => 'Domain Verified',
            'message' => 'Your custom domain has been verified.',
        ]);
    }

    /**
     * Set notification type to ssl_provisioned.
     */
    public function sslProvisioned(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => UserNotification::TYPE_SSL_PROVISIONED,
            'title' => 'SSL Certificate Ready',
            'message' => 'SSL certificate has been provisioned for your domain.',
        ]);
    }
}
