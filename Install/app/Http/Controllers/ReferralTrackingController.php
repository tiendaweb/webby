<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use App\Services\ReferralService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;

class ReferralTrackingController extends Controller
{
    public function __construct(
        protected ReferralService $referralService
    ) {}

    /**
     * Track a referral link click and redirect to registration.
     */
    public function track(Request $request, string $codeOrSlug): RedirectResponse
    {
        // Check if affiliate system is enabled
        if (! $this->referralService->isEnabled()) {
            return redirect('/register');
        }

        // Resolve the referral code
        $code = $this->referralService->resolveCode($codeOrSlug);

        if (! $code) {
            return redirect('/register');
        }

        // Track the click
        $this->referralService->trackClick($code, $request->ip());

        // Get cookie duration from settings
        $cookieDays = (int) SystemSetting::get('affiliate_cookie_days', 30);

        // Set referral cookie and redirect to registration
        $cookie = Cookie::make(
            'referral_code',
            $code->code,
            $cookieDays * 24 * 60 // Convert days to minutes
        );

        return redirect('/register')->withCookie($cookie);
    }
}
