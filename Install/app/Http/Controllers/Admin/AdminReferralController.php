<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReferralCreditTransaction;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AdminReferralController extends Controller
{
    /**
     * Display a listing of referral transactions.
     */
    public function index(Request $request)
    {
        $query = ReferralCreditTransaction::with(['user'])
            ->latest();

        // Apply filters
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $perPage = $request->input('per_page', 10);
        $transactions = $query->paginate($perPage)->withQueryString();

        // Get stats
        $stats = [
            'total_credits' => ReferralCreditTransaction::where('amount', '>', 0)->sum('amount'),
            'total_debits' => abs(ReferralCreditTransaction::where('amount', '<', 0)->sum('amount')),
            'total_transactions' => ReferralCreditTransaction::count(),
            'this_month_credits' => ReferralCreditTransaction::where('amount', '>', 0)
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->sum('amount'),
        ];

        return Inertia::render('Admin/Referrals', [
            'transactions' => $transactions,
            'stats' => $stats,
            'filters' => $request->only(['type', 'search']),
            'types' => ReferralCreditTransaction::getTypes(),
        ]);
    }
}
