<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * OAuth 2.1 support for the MCP connectors.
 *
 * Claude, ChatGPT and Grok can connect to a remote MCP server either with a
 * credential baked into the URL or through an OAuth authorization-code flow
 * they drive themselves. The second path is the one that lets an operator
 * paste a plain endpoint URL — no secret in it — and click "Connect", so
 * these three tables exist to back it:
 *
 * - oauth_clients: registered through RFC 7591 dynamic client registration,
 *   because none of these products can be pre-registered by hand.
 * - oauth_authorization_codes: short-lived, single-use, PKCE-bound.
 * - oauth_refresh_tokens: rotated on every use.
 *
 * Access tokens are NOT stored here — they are ordinary Sanctum personal
 * access tokens, so an OAuth-issued token and a hand-issued one authenticate
 * through exactly the same path and appear in the same revocation UI.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oauth_clients', function (Blueprint $table) {
            $table->string('id', 64)->primary();          // client_id
            $table->string('name');
            $table->string('secret_hash')->nullable();     // null = public client (PKCE only)
            $table->json('redirect_uris');
            $table->json('grant_types');
            $table->string('token_endpoint_auth_method', 40)->default('none');
            $table->string('client_uri')->nullable();
            $table->string('logo_uri')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
        });

        Schema::create('oauth_authorization_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code_hash', 64)->unique();
            $table->string('client_id', 64)->index();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('redirect_uri');
            $table->json('scopes');
            $table->string('code_challenge')->nullable();
            $table->string('code_challenge_method', 10)->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });

        Schema::create('oauth_refresh_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('token_hash', 64)->unique();
            $table->string('client_id', 64)->index();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // The Sanctum token this refresh token currently backs, so
            // rotating or revoking one takes the other with it.
            $table->unsignedBigInteger('access_token_id')->nullable()->index();
            $table->json('scopes');
            $table->timestamp('expires_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('oauth_refresh_tokens');
        Schema::dropIfExists('oauth_authorization_codes');
        Schema::dropIfExists('oauth_clients');
    }
};
