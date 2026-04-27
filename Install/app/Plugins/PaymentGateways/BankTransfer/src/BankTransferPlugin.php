<?php

namespace App\Plugins\PaymentGateways;

use App\Contracts\PaymentGatewayPlugin;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Transaction;
use App\Models\User;
use App\Notifications\AdminPaymentNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class BankTransferPlugin implements PaymentGatewayPlugin
{
    private array $config;

    public function __construct(?array $config = null)
    {
        $this->config = $config ?? [];
    }

    /*
    |--------------------------------------------------------------------------
    | Base Plugin Methods
    |--------------------------------------------------------------------------
    */

    public function getName(): string
    {
        return 'Bank Transfer';
    }

    public function getDescription(): string
    {
        return 'Accept manual bank transfer payments with admin approval workflow';
    }

    public function getType(): string
    {
        return 'payment_gateway';
    }

    public function getIcon(): string
    {
        return 'plugins/bank-transfer/icon.svg';
    }

    public function getVersion(): string
    {
        return '1.0.0';
    }

    public function getAuthor(): string
    {
        return 'Titan Systems';
    }

    public function getAuthorUrl(): string
    {
        return 'https://titansys.dev';
    }

    public function isConfigured(): bool
    {
        return ! empty($this->config['instructions']);
    }

    public function validateConfig(array $config): void
    {
        if (empty($config['instructions'])) {
            throw new \Exception('Bank transfer instructions are required');
        }
    }

    public function getConfigSchema(): array
    {
        return [
            [
                'name' => 'instructions',
                'label' => 'Payment Instructions',
                'type' => 'textarea',
                'required' => true,
                'rows' => 10,
                'placeholder' => "Bank Name: Your Bank\nAccount Name: Your Company\nAccount Number: 1234567890\nRouting Number: 123456789\n\nPlease use your email address as the payment reference.",
                'help' => 'These instructions will be displayed to users when they select bank transfer. Include all necessary bank details and any reference requirements.',
            ],
            [
                'name' => 'confirmation_email',
                'label' => 'Send Confirmation Email',
                'type' => 'toggle',
                'default' => true,
                'help' => 'Send an email to the user with payment instructions after they initiate a bank transfer.',
            ],
            [
                'name' => 'admin_notification',
                'label' => 'Notify Admin',
                'type' => 'toggle',
                'default' => true,
                'help' => 'Send a notification to admins when a new bank transfer payment is initiated.',
            ],
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Payment Gateway Methods
    |--------------------------------------------------------------------------
    */

    public function initPayment(Plan $plan, User $user): RedirectResponse|string|array
    {
        // Check for existing pending subscription
        $existingPending = Subscription::where('user_id', $user->id)
            ->where('payment_method', Subscription::PAYMENT_BANK_TRANSFER)
            ->where('status', Subscription::STATUS_PENDING)
            ->first();

        if ($existingPending) {
            throw new \Exception('You already have a pending bank transfer. Please complete or cancel it first.');
        }

        $amount = round($plan->price, 2);
        $renewalAt = $this->calculateRenewalDate($plan);

        // Create subscription with pending status
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'payment_method' => Subscription::PAYMENT_BANK_TRANSFER,
            'external_subscription_id' => 'BT-'.strtoupper(Str::random(10)),
            'status' => Subscription::STATUS_PENDING,
            'amount' => $amount,
            'renewal_at' => $renewalAt,
            'metadata' => [
                'instructions' => $this->config['instructions'] ?? null,
            ],
        ]);

        // Create pending transaction
        $transaction = Transaction::create([
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
            'amount' => $amount,
            'currency' => \App\Helpers\CurrencyHelper::getCode(),
            'status' => Transaction::STATUS_PENDING,
            'type' => Transaction::TYPE_SUBSCRIPTION_NEW,
            'payment_method' => Transaction::PAYMENT_BANK_TRANSFER,
            'transaction_date' => now(),
            'metadata' => [
                'bank_transfer_instructions' => $this->config['instructions'] ?? null,
            ],
        ]);

        // Send admin notification if configured
        if ($this->config['admin_notification'] ?? true) {
            AdminPaymentNotification::sendIfEnabled(
                'bank_transfer_pending',
                $user,
                $subscription,
                $transaction
            );
        }

        // Send confirmation email to user if configured
        if ($this->config['confirmation_email'] ?? false) {
            $user->notify(new \App\Notifications\BankTransferInstructionsNotification(
                $transaction,
                $this->config['instructions'] ?? ''
            ));
        }

        // Return bank transfer data for dialog display
        return [
            'type' => 'bank_transfer',
            'subscription_id' => $subscription->id,
            'reference' => $subscription->external_subscription_id,
            'amount' => $amount,
            'plan_name' => $plan->name,
            'instructions' => $this->config['instructions'] ?? '',
        ];
    }

    public function handleWebhook(Request $request): Response
    {
        // Bank transfer doesn't use webhooks - all processing is manual
        return response('Bank Transfer does not use webhooks', 404);
    }

    public function callback(Request $request): RedirectResponse
    {
        // No callback for manual bank transfers
        return redirect()->route('create');
    }

    public function cancelSubscription(Subscription $subscription): void
    {
        // For bank transfer, just update the local subscription status
        $subscription->update([
            'status' => Subscription::STATUS_CANCELLED,
            'ends_at' => now(),
            'cancelled_at' => now(),
        ]);
    }

    public function getSubscriptionStatus(string $subscriptionId): array
    {
        // Bank transfer has no remote status - return local status
        $subscription = Subscription::where('external_subscription_id', $subscriptionId)->first();

        if (! $subscription) {
            throw new \Exception("Subscription not found: {$subscriptionId}");
        }

        return [
            'status' => $subscription->status,
            'renewal_at' => $subscription->renewal_at?->toISOString(),
            'amount' => $subscription->amount,
        ];
    }

    public function getSupportedCurrencies(): array
    {
        return []; // Supports all currencies
    }

    public function supportsAutoRenewal(): bool
    {
        return false;
    }

    public function requiresManualApproval(): bool
    {
        return true;
    }

    /*
    |--------------------------------------------------------------------------
    | Helper Methods
    |--------------------------------------------------------------------------
    */

    private function calculateRenewalDate(Plan $plan): \Carbon\Carbon
    {
        $billingPeriod = $plan->billing_period ?? 'monthly';

        return match ($billingPeriod) {
            'yearly' => now()->addYear(),
            'lifetime' => now()->addYears(100),
            default => now()->addMonth(),
        };
    }

    /**
     * Get the bank transfer instructions.
     */
    public function getInstructions(): ?string
    {
        return $this->config['instructions'] ?? null;
    }
}
