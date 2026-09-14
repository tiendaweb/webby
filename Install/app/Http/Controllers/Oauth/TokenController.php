<?php

namespace App\Http\Controllers\Oauth;

use App\Http\Controllers\Controller;
use App\Models\OAuthAuthorizationCode;
use App\Models\OAuthClient;
use App\Models\OAuthRefreshToken;
use App\Services\Oauth\OAuthServerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * The token endpoint: authorization_code exchange and refresh_token
 * rotation.
 *
 * Both grants converge on the same thing — a Sanctum personal access token
 * carrying the abilities the administrator approved — so nothing downstream
 * has to know whether a caller arrived through OAuth or through the Connect
 * screen.
 */
class TokenController extends Controller
{
    public function __construct(private readonly OAuthServerService $oauth) {}

    public function issue(Request $request): JsonResponse
    {
        return match ((string) $request->input('grant_type')) {
            'authorization_code' => $this->authorizationCodeGrant($request),
            'refresh_token' => $this->refreshTokenGrant($request),
            default => $this->error('unsupported_grant_type', 'Supported grants: authorization_code, refresh_token.'),
        };
    }

    private function authorizationCodeGrant(Request $request): JsonResponse
    {
        $client = $this->authenticateClient($request);

        if (! $client) {
            return $this->error('invalid_client', 'Unknown client, or the client secret does not match.', 401);
        }

        $code = (string) $request->input('code', '');

        if ($code === '') {
            return $this->error('invalid_request', '"code" is required.');
        }

        // Validate and claim in one transaction: two clients racing the
        // same code must not both walk away with a token, and a code must
        // not be burned by a request that turns out to be invalid — a
        // mistyped verifier should be retryable, not force the operator
        // back through the whole consent flow.
        $outcome = DB::transaction(function () use ($code, $client, $request) {
            $found = OAuthAuthorizationCode::where('code_hash', hash('sha256', $code))
                ->lockForUpdate()
                ->first();

            if (! $found || ! $found->isUsable() || $found->client_id !== $client->id) {
                return ['error' => 'This authorization code is unknown, expired, or already used.'];
            }

            if ((string) $request->input('redirect_uri', '') !== $found->redirect_uri) {
                return ['error' => 'The redirect_uri does not match the one the code was issued for.'];
            }

            if (! $found->verifyCodeVerifier($request->input('code_verifier'))) {
                return ['error' => 'The PKCE code verifier does not match the challenge.'];
            }

            $found->forceFill(['used_at' => now()])->save();

            return ['code' => $found];
        });

        if (isset($outcome['error'])) {
            return $this->error('invalid_grant', $outcome['error']);
        }

        $record = $outcome['code'];

        $user = $record->user;

        if (! $user || ! $user->isAdmin()) {
            return $this->error('invalid_grant', 'The account that approved this connection is no longer an administrator.');
        }

        $pair = $this->oauth->issueTokenPair($user, $client, $record->scopes ?? []);

        return $this->tokenResponse($pair);
    }

    private function refreshTokenGrant(Request $request): JsonResponse
    {
        $client = $this->authenticateClient($request);

        if (! $client) {
            return $this->error('invalid_client', 'Unknown client, or the client secret does not match.', 401);
        }

        $presented = (string) $request->input('refresh_token', '');

        if ($presented === '') {
            return $this->error('invalid_request', '"refresh_token" is required.');
        }

        $record = DB::transaction(function () use ($presented, $client) {
            $found = OAuthRefreshToken::where('token_hash', hash('sha256', $presented))
                ->lockForUpdate()
                ->first();

            if (! $found || ! $found->isUsable() || $found->client_id !== $client->id) {
                return null;
            }

            // Rotation: this token is spent the moment it is accepted, and
            // the access token it was backing goes with it.
            $found->forceFill(['revoked_at' => now()])->save();

            return $found;
        });

        if (! $record) {
            return $this->error('invalid_grant', 'This refresh token is unknown, expired, or already used.');
        }

        $this->oauth->revokeAccessTokenFor($record);

        $user = $record->user;

        if (! $user || ! $user->isAdmin()) {
            return $this->error('invalid_grant', 'The account behind this connection is no longer an administrator.');
        }

        $pair = $this->oauth->issueTokenPair($user, $client, $record->scopes ?? []);

        return $this->tokenResponse($pair);
    }

    /**
     * RFC 7009 revocation. Answers 200 whatever happens, as the spec
     * requires — telling a caller whether a token existed is an oracle.
     */
    public function revoke(Request $request): JsonResponse
    {
        $presented = (string) $request->input('token', '');

        if ($presented !== '') {
            $record = OAuthRefreshToken::where('token_hash', hash('sha256', $presented))->first();

            if ($record) {
                $this->oauth->revokeAccessTokenFor($record);
                $record->forceFill(['revoked_at' => now()])->save();
            } else {
                // It may be an access token rather than a refresh token.
                $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($presented);
                $accessToken?->delete();
            }
        }

        return response()->json(['revoked' => true])->header('Access-Control-Allow-Origin', '*');
    }

    /**
     * Public clients authenticate with PKCE alone (no secret); confidential
     * ones may send the secret in the body or as HTTP Basic.
     */
    private function authenticateClient(Request $request): ?OAuthClient
    {
        $clientId = (string) $request->input('client_id', '');
        $clientSecret = $request->input('client_secret');

        if ($clientId === '' && $request->getUser() !== null) {
            $clientId = (string) $request->getUser();
            $clientSecret = $request->getPassword();
        }

        if ($clientId === '') {
            return null;
        }

        $client = OAuthClient::find($clientId);

        if (! $client || ! $client->verifySecret(is_string($clientSecret) ? $clientSecret : null)) {
            return null;
        }

        return $client;
    }

    private function tokenResponse(array $pair): JsonResponse
    {
        return response()->json([
            'access_token' => $pair['access_token'],
            'token_type' => 'Bearer',
            'expires_in' => $pair['expires_in'],
            'refresh_token' => $pair['refresh_token'],
            'scope' => implode(' ', $pair['abilities']),
        ])
            ->header('Cache-Control', 'no-store')
            ->header('Pragma', 'no-cache')
            ->header('Access-Control-Allow-Origin', '*');
    }

    private function error(string $error, string $description, int $status = 400): JsonResponse
    {
        return response()->json([
            'error' => $error,
            'error_description' => $description,
        ], $status)->header('Access-Control-Allow-Origin', '*');
    }
}
