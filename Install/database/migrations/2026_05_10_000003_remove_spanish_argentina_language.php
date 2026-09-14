<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Normalize users that still have es_AR to es.
        DB::table('users')
            ->where('locale', 'es_AR')
            ->update(['locale' => 'es']);

        // Normalize system default locale if it was set to es_AR.
        DB::table('system_settings')
            ->where('key', 'default_locale')
            ->where('value', 'es_AR')
            ->update(['value' => 'es']);

        // Remove Spanish (Argentina) language from available languages.
        DB::table('languages')
            ->where('code', 'es_AR')
            ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Intentionally no-op: this migration removes deprecated locale data.
    }
};
