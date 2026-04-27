<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Transaction;
use App\Services\InvoiceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\Response;

class BillingController extends Controller
{
    public function __construct(
        protected InvoiceService $invoiceService
    ) {}

    /**
     * Display the user billing page.
     */
    public function index(Request $request): InertiaResponse
    {
        $user = Auth::user();

        // Get active subscription with plan
        $subscription = $user->activeSubscription()
            ->with('plan')
            ->first();

        // Get pending bank transfer subscription (if any)
        $pendingSubscription = $user->subscriptions()
            ->where('status', Subscription::STATUS_PENDING)
            ->where('payment_method', Subscription::PAYMENT_BANK_TRANSFER)
            ->with('plan')
            ->first();

        // Get user's transactions with pagination
        $transactions = $user->transactions()
            ->with('subscription.plan')
            ->latest('transaction_date')
            ->paginate(10);

        // Get available active plans
        $plans = Plan::active()
            ->orderBy('sort_order')
            ->get();

        // Get available payment gateways
        $paymentGateways = $this->getAvailableGateways();

        return Inertia::render('Billing/Index', [
            'subscription' => $subscription,
            'pendingSubscription' => $pendingSubscription,
            'transactions' => $transactions,
            'plans' => $plans,
            'paymentGateways' => $paymentGateways,
        ]);
    }

    /**
     * Display the plans page.
     */
    public function plans(): InertiaResponse
    {
        $user = Auth::user();

        // Get available active plans
        $plans = Plan::active()
            ->orderBy('sort_order')
            ->get();

        // Get available payment gateways
        $paymentGateways = $this->getAvailableGateways();

        // Get current plan ID if user has active subscription
        $currentPlanId = $user->activeSubscription?->plan_id;

        return Inertia::render('Billing/Plans', [
            'plans' => $plans,
            'paymentGateways' => $paymentGateways,
            'currentPlanId' => $currentPlanId,
            'referralCreditBalance' => (float) $user->referral_credit_balance,
        ]);
    }

    /**
     * Download/view invoice PDF for a transaction.
     */
    public function downloadInvoice(Transaction $transaction): Response
    {
        // Authorization: User must own the transaction
        if ($transaction->user_id !== Auth::id()) {
            abort(403, 'You are not authorized to view this invoice.');
        }

        return $this->invoiceService->streamPdf($transaction);
    }

    /**
     * Cancel the user's active subscription.
     */
    public function cancelSubscription(Request $request)
    {
        $user = Auth::user();
        $subscription = $user->activeSubscription;

        if (! $subscription) {
            return back()->with('error', 'You do not have an active subscription to cancel.');
        }

        $reason = $request->input('reason', 'Cancelled by user');
        $subscription->cancel($user->id, false, $reason);

        return back()->with('success', 'Your subscription has been cancelled.');
    }

    /**
     * Get available payment gateways.
     * Filters by active status and currency support.
     */
    protected function getAvailableGateways(): array
    {
        // Get active gateways that support the current system currency
        $plugins = \App\Models\Plugin::active()
            ->byType('payment_gateway')
            ->get();

        $currency = \App\Helpers\CurrencyHelper::getCode();

        return $plugins->filter(function ($plugin) use ($currency) {
            $gateway = $plugin->getInstance();
            $supported = $gateway->getSupportedCurrencies();

            // Empty array means all currencies supported
            return empty($supported) || in_array($currency, $supported);
        })->map(function ($plugin) {
            $gateway = $plugin->getInstance();

            return [
                'slug' => $plugin->slug,
                'name' => $gateway->getName(),
                'description' => $gateway->getDescription() ?? '',
                'icon' => $gateway->getIcon() ?? '',
                'supports_auto_renewal' => method_exists($gateway, 'supportsAutoRenewal') ? $gateway->supportsAutoRenewal() : false,
                'requires_manual_approval' => method_exists($gateway, 'requiresManualApproval') ? $gateway->requiresManualApproval() : false,
            ];
        })->values()->toArray();
    }
}
