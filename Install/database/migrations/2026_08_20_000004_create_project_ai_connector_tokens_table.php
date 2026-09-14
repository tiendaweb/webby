<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Dedicated credential for the client-side AI Connector — deliberately NOT
 * the existing projects.api_token column, which is a lower-trust token
 * scoped only to anonymous file upload/serve for generated apps. This one
 * grants full project read/write via MCP and is hashed at rest (unlike the
 * plaintext api_token), scoped with an explicit ability list, and revocable
 * independently of that other token.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_ai_connector_tokens', function (Blueprint $table) {
            $table->id();
            $table->uuid('project_id');
            $table->foreignId('ai_connector_activation_id')->nullable()
                ->constrained('project_ai_connector_activations')->nullOnDelete();
            $table->string('name'); // user-assigned label, e.g. "Claude Desktop"
            $table->string('token_hash', 64); // sha256 hex digest, never store plaintext
            $table->string('token_last_four', 4);
            $table->json('scopes')->nullable(); // e.g. ['files:read','files:write']
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            $table->unique('token_hash');
            $table->index(['project_id', 'revoked_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_ai_connector_tokens');
    }
};
