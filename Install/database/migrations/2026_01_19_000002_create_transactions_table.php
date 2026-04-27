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
        if (! Schema::hasTable('transactions')) {
            Schema::create('transactions', function (Blueprint $table) {
                $table->id();
                $table->string('transaction_id')->unique();
                $table->string('external_transaction_id')->nullable();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('subscription_id')->nullable()->constrained()->onDelete('set null');
                $table->decimal('amount', 10, 2);
                $table->string('currency', 3)->default('USD');
                $table->string('status')->default('pending'); // completed, pending, failed, refunded
                $table->string('type'); // subscription_new, subscription_renewal, refund, adjustment
                $table->string('payment_method');
                $table->timestamp('transaction_date');
                $table->json('metadata')->nullable();
                $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'status']);
                $table->index('status');
                $table->index('type');
                $table->index('external_transaction_id');
                $table->index('transaction_date');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
