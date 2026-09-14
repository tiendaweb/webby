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
        // Keep only Spanish active in the language selector.
        DB::table('languages')->where('code', 'es')->update(['is_active' => true]);
        DB::table('languages')->where('code', 'es')->update(['is_default' => true]);
        DB::table('languages')->where('code', 'es')->update(['sort_order' => 1]);

        DB::table('languages')
            ->where('code', '!=', 'es')
            ->update(['is_active' => false, 'is_default' => false]);

        // Ensure system default locale is aligned.
        DB::table('system_settings')
            ->where('key', 'default_locale')
            ->update(['value' => 'es']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op intentionally: language activation policy is app-specific.
    }
};
