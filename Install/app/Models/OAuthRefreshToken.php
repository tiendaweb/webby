<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A refresh token, hashed at rest and rotated on every use: redeeming one
 * revokes it and issues a fresh pair. A replayed refresh token therefore
 * fails, and the access token it used to back is already gone.
 */
class OAuthRefreshToken extends Model
{
    protected $table = 'oauth_refresh_tokens';

    protected $fillable = [
        'token_hash',
        'client_id',
        'user_id',
        'access_token_id',
        'scopes',
        'expires_at',
        'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'scopes' => 'array',
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isUsable(): bool
    {
        return $this->revoked_at === null && $this->expires_at->isFuture();
    }
}
