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
            if (! Schema::hasColumn('user_ai_settings', 'grok_api_key')) {
                $table->text('grok_api_key')->nullable()->after('anthropic_api_key');
            }
            if (! Schema::hasColumn('user_ai_settings', 'deepseek_api_key')) {
                $table->text('deepseek_api_key')->nullable()->after('grok_api_key');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_ai_settings', function (Blueprint $table) {
            $table->dropColumn(['grok_api_key', 'deepseek_api_key']);
        });
    }
};
