<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('subscriptions')) {
            Schema::create('subscriptions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('plan_id')->constrained()->onDelete('cascade');
                $table->string('status')->default('pending'); // active, pending, expired, cancelled
                $table->decimal('amount', 10, 2);
                $table->string('payment_method')->nullable(); // paypal, bank_transfer, manual
                $table->string('external_subscription_id')->nullable();
                $table->json('billing_info')->nullable();
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('approved_at')->nullable();
                $table->text('admin_notes')->nullable();
                $table->string('payment_proof')->nullable();
                $table->timestamp('starts_at')->nullable();
                $table->timestamp('renewal_at')->nullable();
                $table->timestamp('ends_at')->nullable();
                $table->timestamp('cancelled_at')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'status']);
                $table->index('status');
                $table->index('renewal_at');
                $table->index('external_subscription_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
