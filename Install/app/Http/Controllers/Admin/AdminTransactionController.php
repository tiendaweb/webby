<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\ChecksDemoMode;
use App\Models\Subscription;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AdminTransactionController extends Controller
{
    use ChecksDemoMode;

    /**
     * Display a listing of transactions.
     */
    public function index(Request $request)
    {
        $query = Transaction::with(['user', 'subscription.plan', 'processedBy'])
            ->latest('transaction_date');

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('transaction_id', 'like', "%{$search}%")
                    ->orWhere('external_transaction_id', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $perPage = $request->input('per_page', 10);
        $transactions = $query->paginate($perPage)->withQueryString();

        // Get stats
        $stats = [
            'total_revenue' => Transaction::completed()->sum('amount'),
            'this_month' => Transaction::completed()->thisMonth()->sum('amount'),
            'pending_count' => Transaction::pending()->count(),
            'pending_amount' => Transaction::pending()->sum('amount'),
            'total_transactions' => Transaction::count(),
            'refunded' => Transaction::refunded()->sum('amount'),
        ];

        return Inertia::render('Admin/Transactions', [
            'transactions' => $transactions,
            'stats' => $stats,
            'filters' => $request->only(['status', 'type', 'payment_method', 'date_from', 'date_to', 'search']),
        ]);
    }

    /**
     * Display the specified transaction.
     */
    public function show(Transaction $transaction)
    {
        $transaction->load(['user', 'subscription.plan', 'processedBy']);

        return Inertia::render('Admin/TransactionDetails', [
            'transaction' => $transaction,
        ]);
    }

    /**
     * Approve a pending bank transfer transaction.
     */
    public function approve(Request $request, Transaction $transaction)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        if ($transaction->status !== Transaction::STATUS_PENDING) {
            return back()->withErrors(['transaction' => 'Only pending transactions can be approved.']);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $transaction->update([
            'status' => Transaction::STATUS_COMPLETED,
            'processed_by' => Auth::id(),
            'notes' => $validated['notes'] ?? 'Approved by admin',
        ]);

        // If this transaction has a subscription, activate it
        if ($transaction->subscription) {
            $subscription = $transaction->subscription;

            if ($subscription->status === Subscription::STATUS_PENDING) {
                $subscription->approve(Auth::user());
            }
        }

        return back()->with('success', 'Transaction approved successfully.');
    }

    /**
     * Reject a pending transaction.
     */
    public function reject(Request $request, Transaction $transaction)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        if ($transaction->status !== Transaction::STATUS_PENDING) {
            return back()->withErrors(['transaction' => 'Only pending transactions can be rejected.']);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $transaction->update([
            'status' => Transaction::STATUS_FAILED,
            'processed_by' => Auth::id(),
            'notes' => 'Rejected: '.$validated['reason'],
        ]);

        // If this transaction has a subscription, cancel it
        if ($transaction->subscription) {
            $subscription = $transaction->subscription;

            if ($subscription->status === Subscription::STATUS_PENDING) {
                $subscription->update([
                    'status' => Subscription::STATUS_CANCELLED,
                    'cancelled_at' => now(),
                    'admin_notes' => 'Payment rejected: '.$validated['reason'],
                ]);
            }
        }

        return back()->with('success', 'Transaction rejected.');
    }

    /**
     * Process a refund for a completed transaction.
     */
    public function refund(Request $request, Transaction $transaction)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        if ($transaction->status !== Transaction::STATUS_COMPLETED) {
            return back()->withErrors(['transaction' => 'Only completed transactions can be refunded.']);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:'.$transaction->amount,
            'reason' => 'required|string|max:1000',
        ]);

        $isFullRefund = (float) $validated['amount'] >= (float) $transaction->amount;

        // Create refund transaction
        Transaction::create([
            'user_id' => $transaction->user_id,
            'subscription_id' => $transaction->subscription_id,
            'amount' => -abs($validated['amount']),
            'currency' => $transaction->currency,
            'status' => Transaction::STATUS_COMPLETED,
            'type' => Transaction::TYPE_REFUND,
            'payment_method' => $transaction->payment_method,
            'transaction_date' => now(),
            'processed_by' => Auth::id(),
            'notes' => 'Refund for '.$transaction->transaction_id.': '.$validated['reason'],
            'metadata' => [
                'original_transaction_id' => $transaction->transaction_id,
                'refund_amount' => $validated['amount'],
                'is_full_refund' => $isFullRefund,
            ],
        ]);

        // Update original transaction
        $transaction->update([
            'status' => $isFullRefund ? Transaction::STATUS_REFUNDED : Transaction::STATUS_COMPLETED,
            'notes' => ($transaction->notes ?? '')."\nRefunded: $".number_format($validated['amount'], 2).' - '.$validated['reason'],
        ]);

        // If full refund and has subscription, cancel it
        if ($isFullRefund && $transaction->subscription) {
            $subscription = $transaction->subscription;
            $subscription->cancel(Auth::id(), true);
            $subscription->user->update(['plan_id' => null]);
        }

        return back()->with('success', 'Refund processed successfully.');
    }

    /**
     * Record a manual adjustment transaction.
     */
    public function adjustment(Request $request)
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'subscription_id' => 'nullable|exists:subscriptions,id',
            'amount' => 'required|numeric',
            'reason' => 'required|string|max:1000',
        ]);

        Transaction::create([
            'user_id' => $validated['user_id'],
            'subscription_id' => $validated['subscription_id'] ?? null,
            'amount' => $validated['amount'],
            'currency' => 'USD',
            'status' => Transaction::STATUS_COMPLETED,
            'type' => Transaction::TYPE_ADJUSTMENT,
            'payment_method' => Transaction::PAYMENT_MANUAL,
            'transaction_date' => now(),
            'processed_by' => Auth::id(),
            'notes' => 'Adjustment: '.$validated['reason'],
        ]);

        return back()->with('success', 'Adjustment recorded successfully.');
    }
}
