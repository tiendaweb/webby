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
        if (! Schema::hasTable('referral_codes')) {
            Schema::create('referral_codes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('code', 20)->unique();
                $table->string('slug', 50)->nullable()->unique();
                $table->boolean('is_active')->default(true);
                $table->unsignedInteger('total_clicks')->default(0);
                $table->unsignedInteger('total_signups')->default(0);
                $table->unsignedInteger('total_conversions')->default(0);
                $table->decimal('total_earnings', 12, 2)->default(0);
                $table->timestamps();

                $table->index(['user_id', 'is_active']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('referral_codes');
    }
};
