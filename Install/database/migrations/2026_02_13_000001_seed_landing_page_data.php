<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Seed landing page data for existing installations that missed the seeder.
     * This ensures v1.0.2 users get the default landing page content on upgrade.
     */
    public function up(): void
    {
        // Only seed if the landing_sections table exists but has no data
        if (Schema::hasTable('landing_sections')) {
            $count = \App\Models\LandingSection::count();

            if ($count === 0) {
                $seeder = new \Database\Seeders\LandingPageSeeder;
                $seeder->run();
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Don't delete landing page data on rollback as users may have customized it
    }
};
