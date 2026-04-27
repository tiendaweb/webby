<?php

namespace App\Http\Controllers;

use App\Models\Language;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LocaleController extends Controller
{
    /**
     * Update the user's locale preference.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'locale' => 'required|string|exists:languages,code',
        ]);

        // Verify language is active
        $language = Language::where('code', $validated['locale'])
            ->where('is_active', true)
            ->first();

        if (! $language) {
            return back()->withErrors(['locale' => __('Invalid language selected.')]);
        }

        // Store in session (works for both guests and authenticated users)
        $request->session()->put('locale', $validated['locale']);

        // Persist to database for authenticated users
        if ($request->user()) {
            $request->user()->update(['locale' => $validated['locale']]);
        }

        return back();
    }
}
