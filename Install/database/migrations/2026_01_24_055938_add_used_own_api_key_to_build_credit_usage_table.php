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
        Schema::table('build_credit_usage', function (Blueprint $table) {
            if (! Schema::hasColumn('build_credit_usage', 'used_own_api_key')) {
                $table->boolean('used_own_api_key')->default(false)->after('action');
                $table->index(['user_id', 'used_own_api_key', 'created_at']);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('build_credit_usage', function (Blueprint $table) {
            $table->dropIndex('build_credit_usage_user_id_used_own_api_key_created_at_index');
            $table->dropColumn('used_own_api_key');
        });
    }
};
