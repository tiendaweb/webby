<?php

namespace App\Http\Controllers;

use App\Models\ReferralCreditTransaction;
use App\Models\SystemSetting;
use App\Services\ReferralRedemptionService;
use App\Services\ReferralService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ReferralController extends Controller
{
    public function __construct(
        protected ReferralService $referralService,
        protected ReferralRedemptionService $redemptionService
    ) {}

    /**
     * Display the referral dashboard.
     */
    public function index(): Response
    {
        $user = Auth::user();
        $stats = $this->referralService->getUserStats($user);
        $redemptionOptions = $this->redemptionService->getRedemptionOptions($user);

        // Get paginated transactions
        $transactions = ReferralCreditTransaction::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('Billing/Referral', [
            'stats' => $stats,
            'redemptionOptions' => $redemptionOptions,
            'transactions' => [
                'data' => $transactions->map(fn ($txn) => [
                    'id' => $txn->id,
                    'amount' => (float) $txn->amount,
                    'balance_after' => (float) $txn->balance_after,
                    'type' => $txn->type,
                    'type_label' => $txn->type_label,
                    'description' => $txn->description,
                    'created_at' => $txn->created_at->format('M d, Y'),
                ]),
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
            'referralEnabled' => $this->referralService->isEnabled(),
        ]);
    }

    /**
     * Generate a referral code for the user.
     */
    public function generateCode(): RedirectResponse
    {
        $user = Auth::user();

        if ($user->referralCode) {
            return back()->with('error', 'You already have a referral code.');
        }

        $user->getOrCreateReferralCode();

        return back()->with('success', 'Referral code generated successfully!');
    }

    /**
     * Update the referral code's custom slug.
     */
    public function updateSlug(Request $request): RedirectResponse
    {
        $request->validate([
            'slug' => [
                'required',
                'string',
                'min:3',
                'max:50',
                'regex:/^[a-z0-9-]+$/',
                'unique:referral_codes,slug',
            ],
        ], [
            'slug.regex' => 'The slug may only contain lowercase letters, numbers, and hyphens.',
        ]);

        $user = Auth::user();
        $code = $user->referralCode;

        if (! $code) {
            return back()->with('error', 'You need to generate a referral code first.');
        }

        $code->update(['slug' => $request->slug]);

        return back()->with('success', 'Custom slug updated successfully!');
    }

    /**
     * Get share data for the ShareDialog component.
     */
    public function getShareData(): JsonResponse
    {
        $user = Auth::user();

        if (! $this->referralService->isEnabled()) {
            return response()->json([
                'enabled' => false,
            ]);
        }

        $code = $user->getOrCreateReferralCode();
        $stats = $this->referralService->getUserStats($user);

        return response()->json([
            'enabled' => true,
            'code' => $code->code,
            'slug' => $code->slug,
            'shareUrl' => $code->getShareUrl(),
            'stats' => [
                'totalSignups' => $stats['total_signups'],
                'totalConversions' => $stats['total_conversions'],
                'totalEarnings' => $stats['total_earnings'],
                'creditBalance' => $stats['credit_balance'],
            ],
            'commissionPercent' => (int) SystemSetting::get('referral_commission_percent', 20),
        ]);
    }
}
