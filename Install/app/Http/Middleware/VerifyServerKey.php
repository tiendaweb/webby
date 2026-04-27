<?php

namespace App\Http\Middleware;

use App\Models\Builder;
use Closure;
use Illuminate\Http\Request;

class VerifyServerKey
{
    /**
     * Handle an incoming request.
     *
     * Validates the X-Server-Key header against active builder server keys.
     */
    public function handle(Request $request, Closure $next)
    {
        $serverKey = $request->header('X-Server-Key');

        if (! $serverKey) {
            return response()->json(['error' => 'X-Server-Key header is required'], 401);
        }

        $builder = Builder::where('server_key', $serverKey)->where('status', 'active')->first();

        if (! $builder) {
            return response()->json(['error' => 'Invalid server key'], 403);
        }

        // Store builder on request for potential use in controllers
        $request->attributes->set('builder', $builder);

        return $next($request);
    }
}
