<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Delete all Zhipu providers
        DB::table('ai_providers')->where('type', 'zhipu')->delete();

        // Drop zhipu_api_key column if it exists
        if (Schema::hasColumn('user_ai_settings', 'zhipu_api_key')) {
            Schema::table('user_ai_settings', function (Blueprint $table) {
                $table->dropColumn('zhipu_api_key');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Add column back for rollback
        Schema::table('user_ai_settings', function (Blueprint $table) {
            $table->text('zhipu_api_key')->nullable();
        });
    }
};
