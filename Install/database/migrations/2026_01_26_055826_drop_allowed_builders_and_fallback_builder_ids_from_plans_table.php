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
        if (Schema::hasColumn('plans', 'allowed_builders')) {
            Schema::table('plans', function (Blueprint $table) {
                $table->dropColumn(['allowed_builders', 'fallback_builder_ids']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->json('allowed_builders')->nullable();
            $table->json('fallback_builder_ids')->nullable();
        });
    }
};
