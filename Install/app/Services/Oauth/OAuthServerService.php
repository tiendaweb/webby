<?php

namespace App\Services\Oauth;

use App\Http\Controllers\Admin\AdminApiTokenController;
use App\Models\OAuthClient;
use App\Models\OAuthRefreshToken;
use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * The small amount of shared state the OAuth endpoints need: what this
 * installation calls itself, which scopes exist, and how a scope string
 * becomes the abilities on a Sanctum token.
 *
 * Scopes here ARE the connector abilities (projects:write, files:read, …).
 * Reusing them rather than inventing a parallel vocabulary means a token
 * minted through OAuth is indistinguishable from one issued on the Connect
 * screen — same authorisation checks, same audit trail, same revoke button.
 */
class OAuthServerService
{
    /** How long an OAuth access token lives before the client must refresh. */
    public const ACCESS_TOKEN_TTL_HOURS = 24;

    /** How long the refresh token stays good, assuming it keeps being used. */
    public const REFRESH_TOKEN_TTL_DAYS = 90;

    /** Authorization codes are redeemed within seconds; minutes is generous. */
    public const AUTHORIZATION_CODE_TTL_MINUTES = 10;

    /**
     * Canonical public origin. Taken from APP_URL because these values end
     * up in signed metadata and in a third party's stored configuration —
     * they must not vary with a proxy header.
     */
    public function baseUrl(): string
    {
        $configured = trim((string) config('app.url'));

        return $configured !== '' ? rtrim($configured, '/') : rtrim(url('/'), '/');
    }

    public function issuer(): string
    {
        return $this->baseUrl();
    }

    public function resourceUrl(): string
    {
        return $this->baseUrl().'/api/mcp/admin';
    }

    /**
     * "mcp" is offered alongside the fine-grained abilities because most
     * clients request a single coarse scope (or none at all) and expect the
     * server to decide — it means "everything this account can do".
     *
     * @return string[]
     */
    public function supportedScopes(): array
    {
        return array_merge(['mcp'], AdminApiTokenController::ABILITIES);
    }

    /**
     * Turn a requested scope string into the abilities to put on the token.
     * Anything unrecognised is dropped rather than rejected: clients pad
     * scope strings with values from other providers, and failing the whole
     * authorisation over "openid" would be unhelpful.
     *
     * @return string[]
     */
    public function resolveAbilities(?string $requestedScope): array
    {
        $requested = preg_split('/[\s,]+/', trim((string) $requestedScope), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        $granular = array_values(array_intersect($requested, AdminApiTokenController::ABILITIES));

        if ($granular !== []) {
            return $granular;
        }

        // No usable scope, or the catch-all: grant the full set. The consent
        // screen spells out exactly what that means before anyone agrees.
        return AdminApiTokenController::ABILITIES;
    }

    /**
     * @param  string[]  $abilities
     * @return array{access_token: string, refresh_token: string, expires_in: int, abilities: string[]}
     */
    public function issueTokenPair(User $user, OAuthClient $client, array $abilities): array
    {
        $expiresAt = now()->addHours(self::ACCESS_TOKEN_TTL_HOURS);

        $accessToken = $user->createToken(
            "OAuth · {$client->name}",
            $abilities,
            $expiresAt
        );

        $refreshPlain = Str::random(64);

        OAuthRefreshToken::create([
            'token_hash' => hash('sha256', $refreshPlain),
            'client_id' => $client->id,
            'user_id' => $user->id,
            'access_token_id' => $accessToken->accessToken->getKey(),
            'scopes' => $abilities,
            'expires_at' => now()->addDays(self::REFRESH_TOKEN_TTL_DAYS),
        ]);

        $client->forceFill(['last_used_at' => now()])->save();

        return [
            'access_token' => $accessToken->plainTextToken,
            'refresh_token' => $refreshPlain,
            'expires_in' => self::ACCESS_TOKEN_TTL_HOURS * 3600,
            'abilities' => $abilities,
        ];
    }

    /**
     * Drop the Sanctum token a refresh token used to back. Called on
     * rotation and on revocation so a rotated-away access token stops
     * working immediately instead of lingering for its full TTL.
     */
    public function revokeAccessTokenFor(OAuthRefreshToken $refreshToken): void
    {
        if ($refreshToken->access_token_id === null) {
            return;
        }

        PersonalAccessToken::where('id', $refreshToken->access_token_id)->delete();
    }
}
