<?php

namespace App\Http\Controllers\Oauth;

use App\Http\Controllers\Controller;
use App\Services\Oauth\OAuthServerService;
use Illuminate\Http\JsonResponse;

/**
 * The metadata documents an MCP client reads before it can authenticate.
 *
 * The sequence a connector actually follows: it POSTs to the MCP endpoint
 * with no credential, gets a 401 whose WWW-Authenticate names the
 * protected-resource metadata URL, fetches that to learn which
 * authorization server to trust, fetches the authorization-server metadata
 * to find the registration/authorize/token endpoints, registers itself, and
 * only then sends the operator's browser to the consent screen.
 *
 * Every step of that is unauthenticated by necessity — these two documents
 * are public, and deliberately contain nothing that isn't already a public
 * URL.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc9728 (protected resource metadata)
 * @see https://datatracker.ietf.org/doc/html/rfc8414 (authorization server metadata)
 */
class DiscoveryController extends Controller
{
    public function __construct(private readonly OAuthServerService $oauth) {}

    public function protectedResource(): JsonResponse
    {
        return $this->publicJson([
            'resource' => $this->oauth->resourceUrl(),
            'authorization_servers' => [$this->oauth->issuer()],
            'scopes_supported' => $this->oauth->supportedScopes(),
            'bearer_methods_supported' => ['header'],
            'resource_documentation' => $this->oauth->baseUrl().'/connect',
        ]);
    }

    public function authorizationServer(): JsonResponse
    {
        $base = $this->oauth->baseUrl();

        return $this->publicJson([
            'issuer' => $this->oauth->issuer(),
            'authorization_endpoint' => $base.'/oauth/authorize',
            'token_endpoint' => $base.'/api/oauth/token',
            'registration_endpoint' => $base.'/api/oauth/register',
            'revocation_endpoint' => $base.'/api/oauth/revoke',
            'scopes_supported' => $this->oauth->supportedScopes(),
            'response_types_supported' => ['code'],
            'grant_types_supported' => ['authorization_code', 'refresh_token'],
            // S256 only. "plain" is still in the spec but there is no reason
            // to accept it from a client that can compute a SHA-256.
            'code_challenge_methods_supported' => ['S256'],
            'token_endpoint_auth_methods_supported' => ['none', 'client_secret_post', 'client_secret_basic'],
            'service_documentation' => $base.'/connect',
        ]);
    }

    /**
     * Discovery documents are fetched cross-origin by browser-hosted
     * clients, and cached hard by everyone else.
     */
    private function publicJson(array $payload): JsonResponse
    {
        return response()->json($payload)
            ->header('Access-Control-Allow-Origin', '*')
            ->header('Cache-Control', 'public, max-age=3600');
    }
}
