<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('account_deletion_requests')) {
            Schema::create('account_deletion_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->enum('status', ['pending', 'confirmed', 'cancelled', 'completed'])->default('pending');
                $table->string('confirmation_token', 64)->unique();
                $table->string('cancellation_token', 64)->unique();
                $table->timestamp('scheduled_at'); // When deletion will execute
                $table->timestamp('confirmed_at')->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'status']);
                $table->index('scheduled_at');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('account_deletion_requests');
    }
};
