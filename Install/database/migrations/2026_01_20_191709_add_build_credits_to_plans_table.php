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
        Schema::table('plans', function (Blueprint $table) {
            if (! Schema::hasColumn('plans', 'monthly_build_credits')) {
                $table->bigInteger('monthly_build_credits')->default(0);
            }
            if (! Schema::hasColumn('plans', 'allow_user_ai_api_key')) {
                $table->boolean('allow_user_ai_api_key')->default(false);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['monthly_build_credits', 'allow_user_ai_api_key']);
        });
    }
};
