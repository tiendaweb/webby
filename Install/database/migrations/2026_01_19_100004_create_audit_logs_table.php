<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null'); // Affected user
                $table->foreignId('actor_id')->nullable()->constrained('users')->onDelete('set null'); // Who performed action
                $table->string('action'); // data_export, account_deletion, consent_change, admin_action, data_access
                $table->string('entity_type')->nullable(); // User, Project, Subscription, etc.
                $table->unsignedBigInteger('entity_id')->nullable();
                $table->json('old_values')->nullable();
                $table->json('new_values')->nullable();
                $table->json('metadata')->nullable();
                $table->ipAddress('ip_address')->nullable();
                $table->text('user_agent')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'action']);
                $table->index(['actor_id', 'action']);
                $table->index(['entity_type', 'entity_id']);
                $table->index('created_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
