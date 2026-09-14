<?php

namespace App\Http\Controllers\Oauth;

use App\Http\Controllers\Controller;
use App\Models\OAuthClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * RFC 7591 dynamic client registration.
 *
 * Open registration looks alarming until you notice what a client row is
 * worth on its own: nothing. It cannot read anything, and the only thing it
 * can do is ask an administrator — who must already be signed in — to
 * approve it on the consent screen, where the client's name and redirect
 * URI are shown. The access decision lives there, not here.
 *
 * Claude, ChatGPT and Grok all register this way; there is no path where an
 * operator could pre-register them by hand.
 */
class RegistrationController extends Controller
{
    /** Stops an open endpoint from being usable as unbounded storage. */
    private const MAX_REDIRECT_URIS = 10;

    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_name' => 'nullable|string|max:180',
            'redirect_uris' => 'required|array|min:1|max:'.self::MAX_REDIRECT_URIS,
            'redirect_uris.*' => 'required|string|max:2000',
            'grant_types' => 'nullable|array',
            'grant_types.*' => 'string|max:60',
            'token_endpoint_auth_method' => 'nullable|string|max:40',
            'client_uri' => 'nullable|string|max:2000',
            'logo_uri' => 'nullable|string|max:2000',
        ]);

        $redirectUris = array_values(array_unique($validated['redirect_uris']));

        foreach ($redirectUris as $uri) {
            if (! $this->isAcceptableRedirectUri($uri)) {
                return response()->json([
                    'error' => 'invalid_redirect_uri',
                    'error_description' => "Redirect URI must be https, or http on localhost: {$uri}",
                ], 400);
            }
        }

        $authMethod = $validated['token_endpoint_auth_method'] ?? 'none';
        $secret = $authMethod === 'none' ? null : Str::random(48);

        $client = OAuthClient::create([
            'id' => OAuthClient::generateId(),
            'name' => $validated['client_name'] ?? 'MCP client',
            'secret_hash' => $secret ? Hash::make($secret) : null,
            'redirect_uris' => $redirectUris,
            'grant_types' => $validated['grant_types'] ?? ['authorization_code', 'refresh_token'],
            'token_endpoint_auth_method' => $authMethod,
            'client_uri' => $validated['client_uri'] ?? null,
            'logo_uri' => $validated['logo_uri'] ?? null,
        ]);

        $response = [
            'client_id' => $client->id,
            'client_id_issued_at' => $client->created_at->getTimestamp(),
            'client_name' => $client->name,
            'redirect_uris' => $client->redirect_uris,
            'grant_types' => $client->grant_types,
            'response_types' => ['code'],
            'token_endpoint_auth_method' => $client->token_endpoint_auth_method,
        ];

        if ($secret !== null) {
            $response['client_secret'] = $secret;
            $response['client_secret_expires_at'] = 0; // never
        }

        return response()->json($response, 201)
            ->header('Access-Control-Allow-Origin', '*');
    }

    /**
     * https everywhere, with an http exception for loopback so a desktop
     * client that listens on 127.0.0.1 can still complete the flow.
     */
    private function isAcceptableRedirectUri(string $uri): bool
    {
        $parts = parse_url($uri);

        if ($parts === false || ! isset($parts['scheme'])) {
            return false;
        }

        $scheme = strtolower($parts['scheme']);
        $host = strtolower((string) ($parts['host'] ?? ''));

        if ($scheme === 'https') {
            return $host !== '';
        }

        if ($scheme === 'http') {
            return in_array($host, ['localhost', '127.0.0.1', '::1'], true);
        }

        // A private-use scheme (myapp://callback) is how a native client
        // comes back; the scheme just has to be well formed.
        return preg_match('/^[a-z][a-z0-9+.\-]*$/', $scheme) === 1;
    }
}
