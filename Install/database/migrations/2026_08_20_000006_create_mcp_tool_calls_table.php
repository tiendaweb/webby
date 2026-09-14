<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 4 hardening: durable audit trail for EVERY MCP tools/call
 * invocation (not just admin_database_query, which had its own ad-hoc
 * log-channel-only trail from Phase 1 — that channel entry stays as a
 * belt-and-suspenders duplicate for that one tool).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mcp_tool_calls', function (Blueprint $table) {
            $table->id();
            $table->string('server'); // admin | project
            $table->string('tool_name');
            $table->foreignId('admin_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->uuid('project_id')->nullable();
            $table->foreignId('connector_token_id')->nullable()->constrained('project_ai_connector_tokens')->nullOnDelete();
            $table->json('arguments')->nullable();
            $table->boolean('success');
            $table->text('error_message')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->timestamps();

            $table->index(['server', 'tool_name']);
            $table->index('project_id');
            $table->index('admin_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mcp_tool_calls');
    }
};
