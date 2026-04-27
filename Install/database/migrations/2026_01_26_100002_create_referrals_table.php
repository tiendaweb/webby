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
        if (! Schema::hasTable('referrals')) {
            Schema::create('referrals', function (Blueprint $table) {
                $table->id();
                $table->foreignId('referrer_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('referee_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('referral_code_id')->constrained()->cascadeOnDelete();
                $table->enum('status', ['pending', 'converted', 'credited', 'invalid'])->default('pending');
                $table->string('ip_address', 45)->nullable();
                $table->string('user_agent')->nullable();
                $table->timestamp('converted_at')->nullable();
                $table->timestamp('credited_at')->nullable();
                $table->foreignId('transaction_id')->nullable()->constrained()->nullOnDelete();
                $table->decimal('commission_amount', 10, 2)->nullable();
                $table->timestamps();

                $table->unique('referee_id');
                $table->index(['referrer_id', 'status']);
                $table->index(['status', 'created_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('referrals');
    }
};
