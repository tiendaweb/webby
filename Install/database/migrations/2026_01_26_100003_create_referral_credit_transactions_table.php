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
        if (! Schema::hasTable('referral_credit_transactions')) {
            Schema::create('referral_credit_transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('referral_id')->nullable()->constrained()->nullOnDelete();
                $table->decimal('amount', 10, 2);
                $table->decimal('balance_after', 10, 2);
                $table->enum('type', [
                    'signup_bonus',
                    'purchase_commission',
                    'billing_redemption',
                    'build_credit_conversion',
                    'admin_adjustment',
                    'refund_clawback',
                ]);
                $table->string('description')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'created_at']);
                $table->index('type');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('referral_credit_transactions');
    }
};
