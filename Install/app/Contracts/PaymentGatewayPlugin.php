<?php

namespace App\Contracts;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

interface PaymentGatewayPlugin extends Plugin
{
    /**
     * Initialize payment for a plan subscription.
     * Returns redirect response, payment URL, or data array for inline display.
     *
     * @param  Plan  $plan  The plan to subscribe to
     * @param  User  $user  The user subscribing
     * @return RedirectResponse|string|array Redirect to payment gateway, payment URL, or data for frontend display
     */
    public function initPayment(Plan $plan, User $user): RedirectResponse|string|array;

    /**
     * Handle webhook from payment provider.
     * Processes subscription events and payment notifications.
     *
     * @param  Request  $request  The webhook request
     * @return Response HTTP 200 response to acknowledge receipt
     */
    public function handleWebhook(Request $request): Response;

    /**
     * Handle callback from payment provider after user completes payment.
     *
     * @param  Request  $request  The callback request
     * @return RedirectResponse Redirect to success/failure page
     */
    public function callback(Request $request): RedirectResponse;

    /**
     * Cancel an active subscription.
     *
     * @param  Subscription  $subscription  The subscription to cancel
     */
    public function cancelSubscription(Subscription $subscription): void;

    /**
     * Get subscription status from payment provider.
     *
     * @param  string  $subscriptionId  The provider's subscription ID
     * @return array Subscription details from provider
     */
    public function getSubscriptionStatus(string $subscriptionId): array;

    /**
     * Get list of supported currencies by this gateway.
     * Return empty array to indicate all currencies are supported.
     *
     * @return array List of supported currency codes (e.g., ['USD', 'EUR'])
     */
    public function getSupportedCurrencies(): array;

    /**
     * Whether this gateway supports automatic renewal.
     */
    public function supportsAutoRenewal(): bool;

    /**
     * Whether this gateway requires manual admin approval.
     */
    public function requiresManualApproval(): bool;
}
