<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Permissive CORS for the MCP endpoints only.
 *
 * Browser-hosted MCP clients (the official MCP Inspector, and the web
 * clients of ChatGPT/Grok when they connect from the page rather than from
 * their backend) send a preflight OPTIONS before the first POST and abort
 * the whole connection when it fails. Wildcard origin is safe here because
 * these routes are stateless and never authenticate from a cookie — the
 * caller must present a bearer token or a token-carrying URL, which a
 * cross-site page cannot obtain just by being in a browser.
 *
 * Mcp-Session-Id is exposed so clients can read the session id back.
 */
class McpCors
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->getMethod() === 'OPTIONS') {
            return $this->decorate(response('', 204));
        }

        return $this->decorate($next($request));
    }

    private function decorate(Response $response): Response
    {
        $response->headers->set('Access-Control-Allow-Origin', '*');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        $response->headers->set(
            'Access-Control-Allow-Headers',
            'Authorization, Content-Type, Accept, X-Connector-Token, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID'
        );
        $response->headers->set('Access-Control-Expose-Headers', 'Mcp-Session-Id, WWW-Authenticate');
        $response->headers->set('Access-Control-Max-Age', '86400');

        return $response;
    }
}
