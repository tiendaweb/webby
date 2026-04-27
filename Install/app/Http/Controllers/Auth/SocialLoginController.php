<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class SocialLoginController extends Controller
{
    /**
     * Supported OAuth providers.
     */
    protected array $providers = ['google', 'facebook', 'github'];

    /**
     * Redirect to the OAuth provider.
     */
    public function redirect(string $provider): RedirectResponse
    {
        if (! $this->isProviderEnabled($provider)) {
            return redirect()->route('login')
                ->withErrors(['error' => ucfirst($provider).' login is not enabled.']);
        }

        if (! $this->isProviderConfigured($provider)) {
            return redirect()->route('login')
                ->withErrors(['error' => ucfirst($provider).' login is not configured.']);
        }

        return Socialite::driver($provider)->redirect();
    }

    /**
     * Handle the OAuth callback.
     */
    public function callback(string $provider): RedirectResponse
    {
        if (! $this->isProviderEnabled($provider)) {
            return redirect()->route('login')
                ->withErrors(['error' => ucfirst($provider).' login is not enabled.']);
        }

        try {
            $socialUser = Socialite::driver($provider)->user();
        } catch (\Exception $e) {
            return redirect()->route('login')
                ->withErrors(['error' => 'Failed to authenticate with '.ucfirst($provider).'.']);
        }

        // Find or create user
        $user = $this->findOrCreateUser($socialUser, $provider);

        if (! $user) {
            return redirect()->route('login')
                ->withErrors(['error' => 'Failed to create user account.']);
        }

        // Log the user in
        Auth::login($user, true);

        return redirect()->intended(route('create'));
    }

    /**
     * Check if a provider is enabled in settings.
     */
    protected function isProviderEnabled(string $provider): bool
    {
        if (! in_array($provider, $this->providers)) {
            return false;
        }

        return SystemSetting::get("{$provider}_login_enabled", false);
    }

    /**
     * Check if a provider is configured with credentials.
     */
    protected function isProviderConfigured(string $provider): bool
    {
        $clientId = SystemSetting::get("{$provider}_client_id");
        $clientSecret = SystemSetting::get("{$provider}_client_secret");

        return ! empty($clientId) && ! empty($clientSecret);
    }

    /**
     * Find or create a user based on OAuth data.
     */
    protected function findOrCreateUser($socialUser, string $provider): ?User
    {
        // First, try to find by provider ID
        $user = User::where('email', $socialUser->getEmail())->first();

        if ($user) {
            // Update avatar if available and user doesn't have one
            if (! $user->avatar && $socialUser->getAvatar()) {
                $user->update(['avatar' => $socialUser->getAvatar()]);
            }

            return $user;
        }

        // Check if registration is enabled
        if (! SystemSetting::get('enable_registration', true)) {
            return null;
        }

        // Create new user
        $defaultPlanId = SystemSetting::get('default_plan_id');

        $user = User::create([
            'name' => $socialUser->getName() ?? $socialUser->getNickname() ?? 'User',
            'email' => $socialUser->getEmail(),
            'password' => Hash::make(Str::random(32)),
            'avatar' => $socialUser->getAvatar(),
            'plan_id' => $defaultPlanId,
        ]);

        // Social login implies verified email
        $user->email_verified_at = now();
        $user->save();

        return $user;
    }
}
