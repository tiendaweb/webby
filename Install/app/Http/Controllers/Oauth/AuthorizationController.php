<?php

namespace App\Http\Controllers\Oauth;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Admin\AdminApiTokenController;
use App\Models\OAuthAuthorizationCode;
use App\Models\OAuthClient;
use App\Models\User;
use App\Services\Oauth\OAuthServerService;
use App\Services\Mcp\McpToolRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The consent screen — the one place in the OAuth flow where a human
 * decides anything.
 *
 * Everything before this point (registration, discovery) is machine-to-
 * machine and grants nothing. Here a signed-in administrator sees which
 * client is asking, where it will be sent back to, and exactly which
 * abilities they are about to hand over, and either approves or does not.
 *
 * Two rules worth stating because getting them wrong is how authorization
 * codes leak:
 * - a bad client_id or an unregistered redirect_uri is rendered as an error
 *   page, never redirected back — redirecting to an unvalidated URI is the
 *   vulnerability itself;
 * - everything else (a denial, an unsupported response_type) redirects back
 *   with an OAuth error, because the client is known-good at that point.
 */
class AuthorizationController extends Controller
{
    public function __construct(
        private readonly OAuthServerService $oauth,
        private readonly McpToolRegistry $registry,
    ) {}

    public function show(Request $request): Response|RedirectResponse
    {
        $client = OAuthClient::find((string) $request->query('client_id'));
        $redirectUri = (string) $request->query('redirect_uri', '');

        if (! $client) {
            return $this->fatal($request, 'This application is not registered with '.config('app.name').'.');
        }

        if ($redirectUri === '' || ! $client->allowsRedirectUri($redirectUri)) {
            return $this->fatal($request, 'The return address this application asked for is not one it registered.');
        }

        $state = (string) $request->query('state', '');

        if ((string) $request->query('response_type') !== 'code') {
            return $this->redirectWithError($redirectUri, 'unsupported_response_type', $state);
        }

        $challengeMethod = (string) $request->query('code_challenge_method', '');

        if ($challengeMethod !== '' && $challengeMethod !== 'S256') {
            return $this->redirectWithError($redirectUri, 'invalid_request', $state, 'Only the S256 code challenge method is supported.');
        }

        /** @var User $user */
        $user = Auth::user();

        // The admin MCP server is the only resource behind this flow, so an
        // approval from a non-admin could only ever mint a token that fails
        // on the first call. Say so instead of issuing it.
        if (! $user->isAdmin()) {
            return $this->fatal(
                $request,
                'Only an administrator can connect an assistant to this platform. You are signed in as '.$user->email.'.'
            );
        }

        $abilities = $this->oauth->resolveAbilities($request->query('scope'));

        return Inertia::render('Oauth/Authorize', [
            // The consent form posts natively (see the page component for
            // why), so it has to carry the token itself instead of relying
            // on Inertia's XHR header.
            'csrfToken' => csrf_token(),
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'uri' => $client->client_uri,
                'redirect_uri' => $redirectUri,
                'redirect_host' => parse_url($redirectUri, PHP_URL_HOST),
                'is_new' => $client->created_at->gt(now()->subMinutes(10)),
            ],
            'abilities' => $abilities,
            'riskyAbilities' => AdminApiTokenController::RISKY_ABILITIES,
            'grantsEverything' => count($abilities) === count(AdminApiTokenController::ABILITIES),
            'toolCount' => count($this->registry->all('admin')),
            'account' => ['name' => $user->name, 'email' => $user->email],
            'accessTokenHours' => OAuthServerService::ACCESS_TOKEN_TTL_HOURS,
            'query' => [
                'client_id' => $client->id,
                'redirect_uri' => $redirectUri,
                'state' => $state,
                'scope' => (string) $request->query('scope', ''),
                'code_challenge' => (string) $request->query('code_challenge', ''),
                'code_challenge_method' => $challengeMethod,
                'resource' => (string) $request->query('resource', ''),
            ],
        ]);
    }

    public function approve(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'client_id' => 'required|string',
            'redirect_uri' => 'required|string',
            'state' => 'nullable|string',
            'scope' => 'nullable|string',
            'code_challenge' => 'nullable|string|max:255',
            'code_challenge_method' => 'nullable|string|in:S256',
            'approve' => 'required|boolean',
        ]);

        $client = OAuthClient::find($validated['client_id']);
        $redirectUri = $validated['redirect_uri'];

        if (! $client || ! $client->allowsRedirectUri($redirectUri)) {
            return $this->fatal($request, 'This authorization request is no longer valid. Start again from the application.');
        }

        $state = (string) ($validated['state'] ?? '');

        // A native form posts "1"/"0" as strings; validate() does not cast.
        if (! filter_var($validated['approve'], FILTER_VALIDATE_BOOLEAN)) {
            return $this->redirectWithError($redirectUri, 'access_denied', $state);
        }

        /** @var User $user */
        $user = Auth::user();

        if (! $user->isAdmin()) {
            return $this->redirectWithError($redirectUri, 'access_denied', $state, 'Only an administrator can authorise this connection.');
        }

        $abilities = $this->oauth->resolveAbilities($validated['scope'] ?? null);
        $code = Str::random(64);

        OAuthAuthorizationCode::create([
            'code_hash' => hash('sha256', $code),
            'client_id' => $client->id,
            'user_id' => $user->id,
            'redirect_uri' => $redirectUri,
            'scopes' => $abilities,
            'code_challenge' => $validated['code_challenge'] ?: null,
            'code_challenge_method' => $validated['code_challenge_method'] ?: null,
            'expires_at' => now()->addMinutes(OAuthServerService::AUTHORIZATION_CODE_TTL_MINUTES),
        ]);

        return redirect()->away($this->appendQuery($redirectUri, array_filter([
            'code' => $code,
            'state' => $state !== '' ? $state : null,
        ])));
    }

    private function fatal(Request $request, string $message): Response
    {
        return Inertia::render('Oauth/Error', [
            'message' => $message,
            'connectUrl' => $this->oauth->baseUrl().'/connect',
        ]);
    }

    private function redirectWithError(string $redirectUri, string $error, string $state, ?string $description = null): RedirectResponse
    {
        return redirect()->away($this->appendQuery($redirectUri, array_filter([
            'error' => $error,
            'error_description' => $description,
            'state' => $state !== '' ? $state : null,
        ])));
    }

    /**
     * Append parameters without destroying any the client already put in
     * its redirect URI — some register a URI that already carries state of
     * their own.
     */
    private function appendQuery(string $uri, array $params): string
    {
        if ($params === []) {
            return $uri;
        }

        $separator = str_contains($uri, '?') ? '&' : '?';

        return $uri.$separator.http_build_query($params);
    }
}
