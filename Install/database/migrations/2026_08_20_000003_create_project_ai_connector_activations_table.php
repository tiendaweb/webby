<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-project entitlement record — mirrors Subscription's shape (status/
 * starts_at/renewal_at/ends_at/payment_method) but scoped to a Project
 * instead of a User, since AI Connector modules are purchased per-site,
 * not account-wide like Plan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_ai_connector_activations', function (Blueprint $table) {
            $table->id();
            $table->uuid('project_id');
            $table->foreignId('ai_connector_module_id')->constrained()->cascadeOnDelete();
            // Denormalized paying owner, for "my activations" queries without joining through projects.
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending'); // active, pending, expired, cancelled
            $table->decimal('amount', 10, 2)->nullable();
            $table->string('payment_method')->nullable();
            $table->string('external_subscription_id')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('renewal_at')->nullable(); // null for one_time pricing_type
            $table->timestamp('ends_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('admin_notes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            // Explicit short name: the auto-generated one exceeds MySQL's 64-char identifier limit.
            $table->unique(['project_id', 'ai_connector_module_id'], 'project_connector_module_unique');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_ai_connector_activations');
    }
};
