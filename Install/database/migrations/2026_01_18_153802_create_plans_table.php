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
        if (! Schema::hasTable('plans')) {
            Schema::create('plans', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug')->unique();
                $table->text('description')->nullable();
                $table->decimal('price', 10, 2)->default(0);
                $table->string('billing_period')->default('monthly'); // monthly, yearly, lifetime
                $table->json('features')->nullable();
                $table->json('allowed_builders')->nullable(); // null = all, [] = none, [1,2,3] = specific
                $table->integer('monthly_build_minutes')->default(-1); // -1 = unlimited
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();
            });
        }

        // Add plan_id to users table
        if (! Schema::hasColumn('users', 'plan_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignId('plan_id')->nullable()->constrained('plans')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['plan_id']);
            $table->dropColumn('plan_id');
        });

        Schema::dropIfExists('plans');
    }
};
