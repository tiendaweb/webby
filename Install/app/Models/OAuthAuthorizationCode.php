<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A one-shot authorization code. Stored hashed, expires in minutes, and is
 * marked used the first time it is redeemed — a replayed code must fail
 * even if it is still inside its lifetime.
 */
class OAuthAuthorizationCode extends Model
{
    protected $table = 'oauth_authorization_codes';

    protected $fillable = [
        'code_hash',
        'client_id',
        'user_id',
        'redirect_uri',
        'scopes',
        'code_challenge',
        'code_challenge_method',
        'expires_at',
        'used_at',
    ];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isUsable(): bool
    {
        return $this->used_at === null && $this->expires_at->isFuture();
    }

    /**
     * Verify the PKCE proof. A code issued with a challenge can only be
     * redeemed by whoever holds the verifier, which is what stops an
     * intercepted redirect from being exchangeable.
     */
    public function verifyCodeVerifier(?string $verifier): bool
    {
        if ($this->code_challenge === null) {
            return true;
        }

        if (! is_string($verifier) || $verifier === '') {
            return false;
        }

        $computed = $this->code_challenge_method === 'plain'
            ? $verifier
            : rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

        return hash_equals($this->code_challenge, $computed);
    }
}
