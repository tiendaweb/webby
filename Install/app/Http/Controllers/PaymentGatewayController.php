<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Subscription;
use App\Services\PluginManager;
use App\Services\ReferralRedemptionService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class PaymentGatewayController extends Controller
{
    public function __construct(
        private PluginManager $pluginManager,
        private ReferralRedemptionService $redemptionService
    ) {}

    /**
     * Handle incoming webhook from a payment gateway.
     */
    public function webhook(Request $request, string $plugin): Response
    {
        try {
            $gateway = $this->pluginManager->getGatewayBySlug($plugin);

            if (! $gateway) {
                Log::warning("Payment webhook received for unknown gateway: {$plugin}");

                return response('Gateway not found', 404);
            }

            Log::info("Processing webhook for {$plugin}", [
                'headers' => $request->headers->all(),
                'payload_size' => strlen($request->getContent()),
            ]);

            return $gateway->handleWebhook($request);
        } catch (\Exception $e) {
            Log::error("Webhook error for {$plugin}: ".$e->getMessage(), [
                'exception' => $e,
            ]);

            return response('Webhook processing failed', 500);
        }
    }

    /**
     * Handle callback/return from a payment gateway.
     */
    public function callback(Request $request)
    {
        $plugin = $request->query('gateway');

        if (! $plugin) {
            Log::warning('Payment callback received without gateway parameter');

            return redirect()->route('create')
                ->with('error', 'Invalid payment callback.');
        }

        try {
            $gateway = $this->pluginManager->getGatewayBySlug($plugin);

            if (! $gateway) {
                Log::warning("Payment callback received for unknown gateway: {$plugin}");

                return redirect()->route('create')
                    ->with('error', 'Payment gateway not found.');
            }

            Log::info("Processing callback for {$plugin}", [
                'query' => $request->query(),
            ]);

            return $gateway->callback($request);
        } catch (\Exception $e) {
            Log::error("Callback error for {$plugin}: ".$e->getMessage(), [
                'exception' => $e,
            ]);

            return redirect()->route('create')
                ->with('error', 'Payment processing failed. Please contact support.');
        }
    }

    /**
     * Initiate a payment for a subscription.
     */
    public function initiatePayment(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'gateway' => 'required|string',
            'apply_referral_credits' => 'boolean',
        ]);

        try {
            $plan = Plan::findOrFail($validated['plan_id']);
            $user = $request->user();

            // Check if user has a pending subscription
            if ($user->hasPendingSubscription()) {
                return back()->withErrors(['subscription' => 'You have a pending subscription. Please wait for it to be processed or cancel it first.']);
            }

            // Check if user already has an active subscription
            if ($user->hasActiveSubscription()) {
                $activeSubscription = $user->activeSubscription;

                // Block if already on this plan
                if ($activeSubscription->plan_id == $plan->id) {
                    return back()->withErrors(['subscription' => 'You are already subscribed to this plan.']);
                }
            }

            // Handle referral credits payment
            if ($validated['apply_referral_credits'] ?? false) {
                return $this->handleReferralCreditsPayment($user, $plan);
            }

            // Handle free plan subscription (price = 0)
            if ($plan->price == 0) {
                // Cancel existing subscription immediately (safe — new sub created atomically)
                if ($user->hasActiveSubscription()) {
                    $user->activeSubscription->cancel($user->id, true, 'Plan change to: '.$plan->name);
                }

                $subscription = Subscription::create([
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'payment_method' => Subscription::PAYMENT_MANUAL,
                    'status' => Subscription::STATUS_ACTIVE,
                    'amount' => 0,
                    'starts_at' => now(),
                    'renewal_at' => $this->calculateRenewalDate($plan),
                ]);

                $user->update(['plan_id' => $plan->id]);

                return redirect()->route('billing.index')
                    ->with('success', 'Plan updated successfully!');
            }

            // Regular payment gateway flow
            // Note: Old subscription is NOT cancelled here — webhook handlers cancel it
            // after payment succeeds, preventing loss of subscription if payment fails
            $gateway = $this->pluginManager->getGatewayBySlug($validated['gateway']);

            if (! $gateway) {
                return back()->withErrors(['gateway' => 'Payment gateway not available.']);
            }

            $result = $gateway->initPayment($plan, $user);

            // If result is an array (e.g., bank transfer data), flash it and redirect back
            if (is_array($result)) {
                return back()->with('bankTransfer', $result);
            }

            // If result is a string (URL), redirect to it
            if (is_string($result)) {
                return redirect($result);
            }

            // Otherwise, it's a RedirectResponse
            return $result;
        } catch (\Exception $e) {
            Log::error('Payment initiation failed: '.$e->getMessage(), [
                'user_id' => $request->user()->id,
                'plan_id' => $validated['plan_id'],
                'gateway' => $validated['gateway'] ?? 'referral_credits',
                'exception' => $e,
            ]);

            return back()->withErrors(['payment' => $e->getMessage()]);
        }
    }

    /**
     * Handle payment using referral credits.
     */
    private function handleReferralCreditsPayment($user, Plan $plan)
    {
        $balance = (float) $user->referral_credit_balance;

        // Check if user has enough credits to cover the full plan price
        if ($balance < $plan->price) {
            return back()->withErrors([
                'referral' => 'Insufficient referral credits. You need $'.number_format($plan->price, 2).
                    ' but only have $'.number_format($balance, 2).'.',
            ]);
        }

        // Redeem credits for the plan price
        $result = $this->redemptionService->redeemForBillingDiscount($user, $plan->price);

        if (! $result['success']) {
            return back()->withErrors(['referral' => $result['error']]);
        }

        // Cancel existing subscription immediately (safe — new sub created atomically)
        if ($user->hasActiveSubscription()) {
            $user->activeSubscription->cancel($user->id, true, 'Plan change to: '.$plan->name);
        }

        // Create subscription directly (skip payment gateway)
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'payment_method' => Subscription::PAYMENT_REFERRAL,
            'status' => Subscription::STATUS_ACTIVE,
            'amount' => $plan->price,
            'starts_at' => now(),
            'renewal_at' => $this->calculateRenewalDate($plan),
            'metadata' => [
                'referral_credits_used' => $plan->price,
                'referral_transaction_id' => $result['transaction']->id,
            ],
        ]);

        // Update user's plan
        $user->update(['plan_id' => $plan->id]);

        Log::info('Subscription created with referral credits', [
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'subscription_id' => $subscription->id,
            'credits_used' => $plan->price,
        ]);

        return redirect()->route('billing.index')
            ->with('success', 'Subscription activated with referral credits!');
    }

    /**
     * Calculate renewal date based on plan billing period.
     */
    private function calculateRenewalDate(Plan $plan): \Carbon\Carbon
    {
        return match ($plan->billing_period) {
            'yearly' => now()->addYear(),
            'lifetime' => now()->addYears(100),
            default => now()->addMonth(),
        };
    }

    /**
     * Get available payment gateways for checkout.
     */
    public function getAvailableGateways()
    {
        $gateways = $this->pluginManager->getActiveGateways();

        $result = [];
        foreach ($gateways as $gateway) {
            $result[] = [
                'slug' => $this->pluginManager->getGatewaySlug($gateway),
                'name' => $gateway->getName(),
                'description' => $gateway->getDescription(),
                'icon' => $gateway->getIcon(),
                'supports_auto_renewal' => $gateway->supportsAutoRenewal(),
                'requires_manual_approval' => $gateway->requiresManualApproval(),
            ];
        }

        return response()->json($result);
    }
}
