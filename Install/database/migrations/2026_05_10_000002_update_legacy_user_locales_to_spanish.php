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
        // Normalize legacy English locales so existing users follow the new Spanish default.
        DB::table('users')
            ->whereIn('locale', ['en', 'en_US'])
            ->update([
                'locale' => 'es',
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('users')
            ->where('locale', 'es')
            ->update([
                'locale' => 'en',
            ]);
    }
};

