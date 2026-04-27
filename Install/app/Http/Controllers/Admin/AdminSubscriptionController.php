<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ChecksDemoMode;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AdminSubscriptionController extends Controller
{
    use ChecksDemoMode;

    /**
     * Display a listing of subscriptions.
     */
    public function index(Request $request)
    {
        $query = Subscription::with(['user', 'plan', 'approvedBy'])
            ->latest();

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('plan_id')) {
            $query->where('plan_id', $request->plan_id);
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = $request->input('per_page', 15);
        $subscriptions = $query->paginate($perPage)->withQueryString();

        // Get stats
        $stats = [
            'total' => Subscription::count(),
            'active' => Subscription::active()->count(),
            'pending' => Subscription::pending()->count(),
            'cancelled' => Subscription::cancelled()->count(),
            'expiring_soon' => Subscription::expiringSoon()->count(),
        ];

        return Inertia::render('Admin/Subscriptions', [
            'subscriptions' => $subscriptions,
            'stats' => $stats,
            'plans' => Plan::where('is_active', true)->get(),
            'filters' => $request->only(['status', 'plan_id', 'payment_method', 'search']),
        ]);
    }

    /**
     * Display the specified subscription.
     */
    public function show(Subscription $subscription)
    {
        $subscription->load(['user', 'plan', 'transactions', 'approvedBy']);

        return Inertia::render('Admin/SubscriptionDetails', [
            'subscription' => $subscription,
        ]);
    }

    /**
     * Store a new manually created subscription.
     */
    public function store(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'plan_id' => 'required|exists:plans,id',
            'status' => 'required|in:active,pending',
            'admin_notes' => 'nullable|string|max:1000',
        ]);

        $user = User::findOrFail($validated['user_id']);
        $plan = Plan::findOrFail($validated['plan_id']);

        // Check if user already has an active subscription
        if ($user->hasActiveSubscription()) {
            return back()->withErrors([
                'user_id' => 'This user already has an active subscription.',
            ]);
        }

        $startsAt = now();
        $renewalAt = $this->calculateRenewalDate($plan, $startsAt);

        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => $validated['status'],
            'amount' => $plan->price,
            'payment_method' => Subscription::PAYMENT_MANUAL,
            'external_subscription_id' => 'MANUAL-'.strtoupper(\Illuminate\Support\Str::random(10)),
            'starts_at' => $validated['status'] === Subscription::STATUS_ACTIVE ? $startsAt : null,
            'renewal_at' => $validated['status'] === Subscription::STATUS_ACTIVE ? $renewalAt : null,
            'admin_notes' => $validated['admin_notes'] ?? null,
            'approved_by' => $validated['status'] === Subscription::STATUS_ACTIVE ? Auth::id() : null,
            'approved_at' => $validated['status'] === Subscription::STATUS_ACTIVE ? now() : null,
        ]);

        // Create initial transaction for active subscriptions
        if ($validated['status'] === Subscription::STATUS_ACTIVE) {
            Transaction::create([
                'user_id' => $user->id,
                'subscription_id' => $subscription->id,
                'amount' => $plan->price,
                'currency' => 'USD',
                'status' => Transaction::STATUS_COMPLETED,
                'type' => Transaction::TYPE_SUBSCRIPTION_NEW,
                'payment_method' => Transaction::PAYMENT_MANUAL,
                'transaction_date' => now(),
                'processed_by' => Auth::id(),
                'notes' => 'Manual subscription created by admin',
            ]);

            // Update user's plan (SubscriptionObserver already set plan_id and
            // build_credits via updateQuietly; this update may redundantly trigger
            // UserObserver::refillBuildCredits — that's safe since the operation is idempotent)
            $user->update(['plan_id' => $plan->id]);

            // Send notification to user
            $user->notify(new \App\Notifications\SubscriptionActivatedNotification($subscription));
        }

        return back()->with('success', 'Subscription created successfully.');
    }

    /**
     * Cancel a subscription.
     */
    public function cancel(Request $request, Subscription $subscription)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:1000',
            'immediate' => 'boolean',
        ]);

        $immediate = $validated['immediate'] ?? false;
        $reason = $validated['reason'] ?? null;

        $subscription->cancel(Auth::id(), $immediate, $reason);

        // Add cancellation note to admin_notes
        if (! empty($reason)) {
            $currentNotes = $subscription->admin_notes ?? '';
            $subscription->update([
                'admin_notes' => $currentNotes."\n[Cancelled] ".now()->format('Y-m-d H:i').': '.$reason,
            ]);
        }

        // If immediate cancellation, reset user's plan
        if ($immediate) {
            $subscription->user->update(['plan_id' => null]);
        }

        // Send notification to user
        $subscription->user->notify(new \App\Notifications\SubscriptionCancelledNotification($subscription));

        return back()->with('success', 'Subscription cancelled successfully.');
    }

    /**
     * Extend a subscription.
     */
    public function extend(Request $request, Subscription $subscription)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'days' => 'required|integer|min:1|max:365',
            'reason' => 'nullable|string|max:1000',
        ]);

        $subscription->extend($validated['days']);

        // Add extension note
        $currentNotes = $subscription->admin_notes ?? '';
        $reason = $validated['reason'] ?? 'No reason provided';
        $subscription->update([
            'admin_notes' => $currentNotes."\n[Extended] ".now()->format('Y-m-d H:i').": Extended by {$validated['days']} days. Reason: {$reason}",
        ]);

        // Create transaction record for the extension
        Transaction::create([
            'user_id' => $subscription->user_id,
            'subscription_id' => $subscription->id,
            'amount' => 0,
            'currency' => 'USD',
            'status' => Transaction::STATUS_COMPLETED,
            'type' => Transaction::TYPE_EXTENSION,
            'payment_method' => Transaction::PAYMENT_MANUAL,
            'transaction_date' => now(),
            'processed_by' => Auth::id(),
            'notes' => "Extended by {$validated['days']} days. Reason: {$reason}",
        ]);

        // Refresh subscription to get updated renewal_at
        $subscription->refresh();

        // Send notification to user
        $subscription->user->notify(new \App\Notifications\SubscriptionExtendedNotification($subscription, $validated['days']));

        return back()->with('success', "Subscription extended by {$validated['days']} days.");
    }

    /**
     * Approve a pending subscription.
     */
    public function approve(Request $request, Subscription $subscription)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        if (! $subscription->isPending()) {
            return back()->withErrors(['subscription' => 'Only pending subscriptions can be approved.']);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        // approve() in model already updates user's plan_id
        $subscription->approve(Auth::user(), $validated['notes'] ?? null);

        // Update related pending transaction
        $pendingTransaction = $subscription->transactions()
            ->where('status', Transaction::STATUS_PENDING)
            ->first();

        if ($pendingTransaction) {
            $pendingTransaction->update([
                'status' => Transaction::STATUS_COMPLETED,
                'processed_by' => Auth::id(),
                'notes' => 'Approved by admin',
            ]);
        }

        // Send notification to user
        $subscription->user->notify(new \App\Notifications\SubscriptionActivatedNotification($subscription));

        return back()->with('success', 'Subscription approved successfully.');
    }

    /**
     * Calculate the renewal date based on plan billing period.
     */
    private function calculateRenewalDate(Plan $plan, $startDate): \Carbon\Carbon
    {
        $billingPeriod = $plan->billing_period ?? 'monthly';

        return match ($billingPeriod) {
            'yearly' => $startDate->copy()->addYear(),
            'lifetime' => $startDate->copy()->addYears(100),
            default => $startDate->copy()->addMonth(),
        };
    }
}
