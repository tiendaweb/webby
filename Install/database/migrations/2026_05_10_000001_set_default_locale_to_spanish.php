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
        // Only override legacy/default English values to avoid clobbering explicit locale choices.
        DB::table('system_settings')
            ->where('key', 'default_locale')
            ->whereIn('value', ['en', 'en_US', '', null])
            ->update([
                'value' => 'es',
                'updated_at' => now(),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('system_settings')
            ->where('key', 'default_locale')
            ->where('value', 'es')
            ->update([
                'value' => 'en',
                'updated_at' => now(),
            ]);
    }
};

