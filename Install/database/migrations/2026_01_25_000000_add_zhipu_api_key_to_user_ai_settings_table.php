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
        Schema::table('user_ai_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('user_ai_settings', 'zhipu_api_key')) {
                $table->text('zhipu_api_key')->nullable()->after('deepseek_api_key');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_ai_settings', function (Blueprint $table) {
            $table->dropColumn('zhipu_api_key');
        });
    }
};
