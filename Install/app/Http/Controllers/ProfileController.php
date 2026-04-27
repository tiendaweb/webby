<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Http\Traits\ChecksDemoMode;
use App\Models\AccountDeletionRequest;
use App\Models\AiProvider;
use App\Models\DataExportRequest;
use App\Models\SystemSetting;
use App\Models\UserAiSettings;
use App\Models\UserConsent;
use App\Services\AuditLogService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    use ChecksDemoMode;

    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        // Get user consents
        $consents = [
            'marketing' => UserConsent::hasConsented($user, UserConsent::TYPE_MARKETING),
            'analytics' => UserConsent::hasConsented($user, UserConsent::TYPE_ANALYTICS),
            'third_party' => UserConsent::hasConsented($user, UserConsent::TYPE_THIRD_PARTY),
        ];

        // Get pending data export request
        $pendingExport = DataExportRequest::where('user_id', $user->id)
            ->whereIn('status', [
                DataExportRequest::STATUS_PENDING,
                DataExportRequest::STATUS_PROCESSING,
                DataExportRequest::STATUS_COMPLETED,
            ])
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->latest()
            ->first();

        // Get pending deletion request
        $pendingDeletion = AccountDeletionRequest::getPendingRequest($user);

        // AI Settings data
        $plan = $user->getCurrentPlan();
        $aiSettings = $user->aiSettings;
        $canUseOwnKey = $plan?->allowsUserAiApiKey() ?? false;

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'consents' => $consents,
            'dataExportEnabled' => SystemSetting::get('data_export_enabled', true),
            'pendingExport' => $pendingExport ? [
                'status' => $pendingExport->status,
                'expires_at' => $pendingExport->expires_at?->toIso8601String(),
                'download_token' => $pendingExport->download_token,
            ] : null,
            'hoursUntilNextExport' => DataExportRequest::hoursUntilNextExport($user),
            'accountDeletionEnabled' => SystemSetting::get('account_deletion_enabled', true),
            'isSuperAdmin' => $user->id === 1,
            'pendingDeletion' => $pendingDeletion ? [
                'scheduled_at' => $pendingDeletion->scheduled_at->toIso8601String(),
                'cancellation_token' => $pendingDeletion->cancellation_token,
            ] : null,
            // AI Settings
            'aiSettings' => $aiSettings ? [
                'preferred_provider' => $aiSettings->preferred_provider,
                'preferred_model' => $aiSettings->preferred_model,
                'has_openai_key' => $aiSettings->hasApiKeyFor('openai'),
                'openai_key_masked' => $aiSettings->getMaskedApiKeyFor('openai'),
                'has_anthropic_key' => $aiSettings->hasApiKeyFor('anthropic'),
                'anthropic_key_masked' => $aiSettings->getMaskedApiKeyFor('anthropic'),
                'has_grok_key' => $aiSettings->hasApiKeyFor('grok'),
                'grok_key_masked' => $aiSettings->getMaskedApiKeyFor('grok'),
                'has_deepseek_key' => $aiSettings->hasApiKeyFor('deepseek'),
                'deepseek_key_masked' => $aiSettings->getMaskedApiKeyFor('deepseek'),
                'has_zhipu_key' => $aiSettings->hasApiKeyFor('zhipu'),
                'zhipu_key_masked' => $aiSettings->getMaskedApiKeyFor('zhipu'),
            ] : null,
            'canUseOwnKey' => $canUseOwnKey,
            'isUsingOwnKey' => $user->isUsingOwnAiApiKey(),
            'providerTypes' => AiProvider::TYPES,
            'defaultModels' => AiProvider::DEFAULT_MODELS,
            'modelPricing' => AiProvider::MODEL_PRICING,
            // Sound settings - available to ALL users
            'soundSettings' => $aiSettings?->getSoundSettings() ?? [
                'enabled' => false,
                'style' => 'minimal',
                'volume' => 50,
            ],
            'soundStyles' => UserAiSettings::SOUND_STYLES,
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        if ($redirect = $this->denyIfDemoAdmin()) {
            return $redirect;
        }

        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Update user consent preferences.
     */
    public function updateConsents(Request $request): RedirectResponse
    {
        if ($redirect = $this->denyIfDemoAdmin()) {
            return $redirect;
        }

        $validated = $request->validate([
            'marketing' => 'required|boolean',
            'analytics' => 'required|boolean',
            'third_party' => 'required|boolean',
        ]);

        $user = $request->user();

        // Get old values for audit log
        $oldConsents = [
            'marketing' => UserConsent::hasConsented($user, UserConsent::TYPE_MARKETING),
            'analytics' => UserConsent::hasConsented($user, UserConsent::TYPE_ANALYTICS),
            'third_party' => UserConsent::hasConsented($user, UserConsent::TYPE_THIRD_PARTY),
        ];

        // Update consents
        $consentTypes = [
            'marketing' => UserConsent::TYPE_MARKETING,
            'analytics' => UserConsent::TYPE_ANALYTICS,
            'third_party' => UserConsent::TYPE_THIRD_PARTY,
        ];

        foreach ($consentTypes as $key => $type) {
            $newValue = $validated[$key];
            $oldValue = $oldConsents[$key];

            if ($newValue !== $oldValue) {
                UserConsent::recordConsent($user, $type, $newValue);
                AuditLogService::logConsentChanged($user, $type, $oldValue, $newValue);
            }
        }

        return Redirect::route('profile.edit')->with('status', 'consent-updated');
    }

    /**
     * Update AI settings.
     */
    public function updateAiSettings(Request $request): RedirectResponse
    {
        if ($redirect = $this->denyIfDemoAdmin()) {
            return $redirect;
        }

        $user = $request->user();
        $plan = $user->getCurrentPlan();

        if (! $plan?->allowsUserAiApiKey()) {
            return back()->withErrors(['error' => 'Your plan does not allow using your own API key.']);
        }

        $validated = $request->validate([
            'preferred_provider' => ['required', 'string', Rule::in(array_merge(['system'], array_keys(AiProvider::TYPES)))],
            'preferred_model' => ['nullable', 'string'],
            'openai_api_key' => ['nullable', 'string'],
            'anthropic_api_key' => ['nullable', 'string'],
            'grok_api_key' => ['nullable', 'string'],
            'deepseek_api_key' => ['nullable', 'string'],
            'zhipu_api_key' => ['nullable', 'string'],
        ]);

        $settings = $user->aiSettings ?? new UserAiSettings(['user_id' => $user->id]);

        $settings->preferred_provider = $validated['preferred_provider'];
        $settings->preferred_model = $validated['preferred_model'];

        if (! empty($validated['openai_api_key'])) {
            $settings->openai_api_key = $validated['openai_api_key'];
        }
        if (! empty($validated['anthropic_api_key'])) {
            $settings->anthropic_api_key = $validated['anthropic_api_key'];
        }
        if (! empty($validated['grok_api_key'])) {
            $settings->grok_api_key = $validated['grok_api_key'];
        }
        if (! empty($validated['deepseek_api_key'])) {
            $settings->deepseek_api_key = $validated['deepseek_api_key'];
        }
        if (! empty($validated['zhipu_api_key'])) {
            $settings->zhipu_api_key = $validated['zhipu_api_key'];
        }

        $settings->save();

        return back()->with('success', 'AI settings updated successfully.');
    }

    /**
     * Test user's API key connection.
     */
    public function testAiKey(Request $request): JsonResponse
    {
        $user = $request->user();
        $plan = $user->getCurrentPlan();

        if (! $plan?->allowsUserAiApiKey()) {
            return response()->json(['success' => false, 'message' => 'Your plan does not allow using your own API key.'], 403);
        }

        $validated = $request->validate([
            'provider' => ['required', 'string', Rule::in(array_keys(AiProvider::TYPES))],
            'api_key' => ['required', 'string'],
        ]);

        $result = $this->testProviderConnection($validated['provider'], $validated['api_key']);

        return response()->json($result);
    }

    /**
     * Remove an API key from user's settings.
     */
    public function removeAiKey(Request $request): RedirectResponse
    {
        if ($redirect = $this->denyIfDemoAdmin()) {
            return $redirect;
        }

        $user = $request->user();

        $validated = $request->validate([
            'provider' => ['required', 'string', Rule::in(array_keys(AiProvider::TYPES))],
        ]);

        $settings = $user->aiSettings;

        if (! $settings) {
            return back()->withErrors(['error' => 'No AI settings found.']);
        }

        $keyField = $validated['provider'].'_api_key';
        $settings->$keyField = null;

        if ($settings->preferred_provider === $validated['provider']) {
            $settings->preferred_provider = 'system';
            $settings->preferred_model = null;
        }

        $settings->save();

        return back()->with('success', 'API key removed successfully.');
    }

    /**
     * Update sound settings.
     * Available to ALL users (not restricted to API key plans).
     */
    public function updateSoundSettings(Request $request): RedirectResponse
    {
        if ($redirect = $this->denyIfDemoAdmin()) {
            return $redirect;
        }

        $user = $request->user();

        $validated = $request->validate([
            'sounds_enabled' => ['required', 'boolean'],
            'sound_style' => ['required', 'string', Rule::in(UserAiSettings::SOUND_STYLES)],
            'sound_volume' => ['required', 'integer', 'min:0', 'max:100'],
        ]);

        $settings = UserAiSettings::firstOrNew(['user_id' => $user->id]);

        $settings->sounds_enabled = $validated['sounds_enabled'];
        $settings->sound_style = $validated['sound_style'];
        $settings->sound_volume = $validated['sound_volume'];

        $settings->save();

        return back()->with('success', 'Sound settings updated successfully.');
    }

    /**
     * Test provider connection with given API key.
     */
    protected function testProviderConnection(string $provider, string $apiKey): array
    {
        try {
            switch ($provider) {
                case 'openai':
                    $response = Http::withHeaders([
                        'Authorization' => 'Bearer '.$apiKey,
                    ])->get('https://api.openai.com/v1/models');

                    if ($response->successful()) {
                        return ['success' => true, 'message' => 'Connection successful'];
                    }

                    return ['success' => false, 'message' => $response->json('error.message', 'Connection failed')];

                case 'anthropic':
                    $response = Http::withHeaders([
                        'x-api-key' => $apiKey,
                        'anthropic-version' => '2023-06-01',
                    ])->post('https://api.anthropic.com/v1/messages', [
                        'model' => 'claude-haiku-4-5',
                        'max_tokens' => 1,
                        'messages' => [['role' => 'user', 'content' => 'Hi']],
                    ]);

                    if ($response->successful()) {
                        return ['success' => true, 'message' => 'Connection successful'];
                    }

                    return ['success' => false, 'message' => $response->json('error.message', 'Connection failed')];

                case 'grok':
                    $response = Http::withHeaders([
                        'Authorization' => 'Bearer '.$apiKey,
                    ])->post('https://api.x.ai/v1/chat/completions', [
                        'model' => 'grok-beta',
                        'max_tokens' => 1,
                        'messages' => [['role' => 'user', 'content' => 'Hi']],
                    ]);

                    if ($response->successful()) {
                        return ['success' => true, 'message' => 'Connection successful'];
                    }

                    return ['success' => false, 'message' => $response->json('error.message', 'Connection failed')];

                case 'deepseek':
                    $response = Http::withHeaders([
                        'Authorization' => 'Bearer '.$apiKey,
                    ])->post('https://api.deepseek.com/chat/completions', [
                        'model' => 'deepseek-chat',
                        'max_tokens' => 1,
                        'messages' => [['role' => 'user', 'content' => 'Hi']],
                    ]);

                    if ($response->successful()) {
                        return ['success' => true, 'message' => 'Connection successful'];
                    }

                    return ['success' => false, 'message' => $response->json('error.message', 'Connection failed')];

                case 'zhipu':
                    $response = Http::withHeaders([
                        'x-api-key' => $apiKey,
                        'anthropic-version' => '2023-06-01',
                    ])->post(AiProvider::DEFAULT_BASE_URLS[AiProvider::TYPE_ZHIPU].'/v1/messages', [
                        'model' => 'glm-5',
                        'max_tokens' => 1,
                        'messages' => [['role' => 'user', 'content' => 'Hi']],
                    ]);

                    if ($response->successful()) {
                        return ['success' => true, 'message' => 'Connection successful'];
                    }

                    return ['success' => false, 'message' => $response->json('error.message', 'Connection failed')];

                default:
                    return ['success' => false, 'message' => 'Unknown provider'];
            }
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        if ($redirect = $this->denyIfDemo()) {
            return $redirect;
        }

        if (session('impersonating_from')) {
            return back()->withErrors(['error' => 'This action is not allowed while impersonating a user.']);
        }

        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        // Prevent deletion of the super admin (first admin account)
        if ($user->id === 1) {
            return back()->withErrors(['error' => 'The super admin account cannot be deleted.']);
        }

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
