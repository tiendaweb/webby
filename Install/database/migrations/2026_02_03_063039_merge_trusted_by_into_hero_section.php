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
        // Get the hero and trusted_by sections
        $heroSection = DB::table('landing_sections')->where('type', 'hero')->first();
        $trustedBySection = DB::table('landing_sections')->where('type', 'trusted_by')->first();

        if (! $heroSection || ! $trustedBySection) {
            return;
        }

        // Move all items from trusted_by to hero
        DB::table('landing_items')
            ->where('section_id', $trustedBySection->id)
            ->update(['section_id' => $heroSection->id]);

        // Move the "title" content field from trusted_by to hero as "trusted_by_title"
        $trustedByTitles = DB::table('landing_contents')
            ->where('section_id', $trustedBySection->id)
            ->where('field', 'title')
            ->get();

        foreach ($trustedByTitles as $content) {
            DB::table('landing_contents')->updateOrInsert(
                [
                    'section_id' => $heroSection->id,
                    'locale' => $content->locale,
                    'field' => 'trusted_by_title',
                ],
                [
                    'value' => $content->value,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // Delete all content from trusted_by section
        DB::table('landing_contents')
            ->where('section_id', $trustedBySection->id)
            ->delete();

        // Delete the trusted_by section
        DB::table('landing_sections')
            ->where('id', $trustedBySection->id)
            ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Get hero section
        $heroSection = DB::table('landing_sections')->where('type', 'hero')->first();

        if (! $heroSection) {
            return;
        }

        // Create trusted_by section
        $trustedBySectionId = DB::table('landing_sections')->insertGetId([
            'type' => 'trusted_by',
            'sort_order' => 8,
            'is_enabled' => true,
            'settings' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Move logo items from hero to trusted_by
        // Note: This will move ALL items from hero, which might not be desired
        // In practice, hero should only have logo items after migration
        DB::table('landing_items')
            ->where('section_id', $heroSection->id)
            ->update(['section_id' => $trustedBySectionId]);

        // Move trusted_by_title content back to trusted_by as title
        $trustedByTitles = DB::table('landing_contents')
            ->where('section_id', $heroSection->id)
            ->where('field', 'trusted_by_title')
            ->get();

        foreach ($trustedByTitles as $content) {
            DB::table('landing_contents')->insert([
                'section_id' => $trustedBySectionId,
                'locale' => $content->locale,
                'field' => 'title',
                'value' => $content->value,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Delete trusted_by_title from hero
        DB::table('landing_contents')
            ->where('section_id', $heroSection->id)
            ->where('field', 'trusted_by_title')
            ->delete();
    }
};
