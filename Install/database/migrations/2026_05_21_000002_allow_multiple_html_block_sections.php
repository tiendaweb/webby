<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The (landing_page_id, type) unique index prevents multiple html_block sections.
        // MySQL won't drop an index that supports a FK unless another index covers the FK column.
        // Solution: add a regular index on landing_page_id first, then drop the unique one.
        try {
            DB::statement('ALTER TABLE landing_sections ADD INDEX idx_landing_page_id (landing_page_id)');
        } catch (\Exception $e) {
            // Index may already exist
        }

        try {
            DB::statement('ALTER TABLE landing_sections DROP INDEX unique_page_section_type');
        } catch (\Exception $e) {
            // Already removed or never existed
        }
    }

    public function down(): void
    {
        try {
            DB::statement('ALTER TABLE landing_sections DROP INDEX idx_landing_page_id');
        } catch (\Exception $e) {
        }

        try {
            Schema::table('landing_sections', function ($table) {
                $table->unique(['landing_page_id', 'type'], 'unique_page_section_type');
            });
        } catch (\Exception $e) {
        }
    }
};
