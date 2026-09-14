<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * An OAuth client that registered itself against this installation through
 * RFC 7591 dynamic client registration.
 *
 * Registration is open (no initial access token) because that is the only
 * thing Claude, ChatGPT and Grok can do — they discover the registration
 * endpoint from the server metadata and enrol on the spot, before any human
 * is involved. Registering is therefore deliberately NOT a grant of access:
 * a client row on its own can do nothing until a signed-in administrator
 * approves it on the consent screen, which is where the real decision is
 * made.
 */
class OAuthClient extends Model
{
    // Laravel would derive "o_auth_clients" from the class name.
    protected $table = 'oauth_clients';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'secret_hash',
        'redirect_uris',
        'grant_types',
        'token_endpoint_auth_method',
        'client_uri',
        'logo_uri',
        'last_used_at',
    ];

    protected $hidden = ['secret_hash'];

    protected function casts(): array
    {
        return [
            'redirect_uris' => 'array',
            'grant_types' => 'array',
            'last_used_at' => 'datetime',
        ];
    }

    public static function generateId(): string
    {
        return 'mcp_'.Str::random(32);
    }

    public function isPublic(): bool
    {
        return $this->secret_hash === null;
    }

    public function verifySecret(?string $secret): bool
    {
        if ($this->isPublic()) {
            // A public client authenticates with PKCE alone; presenting a
            // secret it was never issued is not a reason to fail.
            return true;
        }

        return is_string($secret) && $secret !== '' && Hash::check($secret, $this->secret_hash);
    }

    /**
     * Exact-match only. Prefix or wildcard matching on redirect URIs is the
     * classic way an authorization code ends up delivered to somebody else.
     */
    public function allowsRedirectUri(string $uri): bool
    {
        return in_array($uri, (array) $this->redirect_uris, true);
    }
}
