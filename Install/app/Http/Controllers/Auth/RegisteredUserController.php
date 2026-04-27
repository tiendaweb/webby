<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Models\User;
use App\Notifications\AdminUserRegisteredNotification;
use App\Rules\RecaptchaToken;
use App\Services\AdminNotificationService;
use App\Services\ReferralService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $minLength = SystemSetting::get('password_min_length', 8);
        $defaultPlanId = SystemSetting::get('default_plan_id');

        $rules = [
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Password::min($minLength)],
        ];

        // Add reCAPTCHA validation if enabled
        if (SystemSetting::get('recaptcha_enabled', false)) {
            $rules['recaptcha_token'] = ['required', 'string', new RecaptchaToken];
        }

        $request->validate($rules);

        try {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'plan_id' => $defaultPlanId,
            ]);
        } catch (UniqueConstraintViolationException $e) {
            if (str_contains($e->getMessage(), 'email')) {
                throw ValidationException::withMessages([
                    'email' => __('validation.unique', ['attribute' => 'email']),
                ]);
            }

            throw $e;
        }

        event(new Registered($user));

        // Log email for lead collection in demo mode
        if (config('app.demo')) {
            $logPath = base_path('demo-registrations.txt');
            $handle = fopen($logPath, 'a+');
            if ($handle && flock($handle, LOCK_EX)) {
                rewind($handle);
                $contents = stream_get_contents($handle);
                $existingEmails = array_filter(array_map('trim', explode("\n", $contents)));
                if (! in_array($user->email, $existingEmails, true)) {
                    fwrite($handle, $user->email."\n");
                }
                flock($handle, LOCK_UN);
                fclose($handle);
            } elseif ($handle) {
                fclose($handle);
            }
        }

        // Process referral tracking if referral cookie exists
        $referralCode = $request->cookie('referral_code');
        if ($referralCode) {
            $referralService = app(ReferralService::class);
            if ($referralService->isEnabled()) {
                $code = $referralService->resolveCode($referralCode);
                if ($code) {
                    $referralService->createReferral(
                        $user,
                        $code,
                        $request->ip(),
                        $request->userAgent()
                    );
                }
            }
        }

        // Send admin notification if enabled
        AdminNotificationService::notify(
            'user_registered',
            new AdminUserRegisteredNotification($user)
        );

        Auth::login($user);

        return redirect(route('create', absolute: false));
    }
}
