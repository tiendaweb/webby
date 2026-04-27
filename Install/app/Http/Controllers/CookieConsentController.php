<?php

namespace App\Http\Controllers;

use App\Models\UserConsent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CookieConsentController extends Controller
{
    /**
     * Store cookie consent preferences for the authenticated user.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'analytics' => 'required|boolean',
            'marketing' => 'required|boolean',
            'functional' => 'required|boolean',
        ]);

        $user = $request->user();

        // Record analytics consent
        UserConsent::recordConsent(
            $user,
            UserConsent::TYPE_ANALYTICS,
            $validated['analytics']
        );

        // Record marketing consent
        UserConsent::recordConsent(
            $user,
            UserConsent::TYPE_MARKETING,
            $validated['marketing']
        );

        // Record functional consent (third-party)
        UserConsent::recordConsent(
            $user,
            UserConsent::TYPE_THIRD_PARTY,
            $validated['functional']
        );

        return back();
    }
}
