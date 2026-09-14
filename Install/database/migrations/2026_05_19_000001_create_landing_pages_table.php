<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create landing_pages table
        if (! Schema::hasTable('landing_pages')) {
            Schema::create('landing_pages', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('slug', 100)->unique();
                $table->boolean('is_home')->default(false);
                $table->boolean('is_active')->default(true);
                $table->string('meta_title')->nullable();
                $table->text('meta_description')->nullable();
                $table->json('settings')->nullable();
                $table->timestamps();
            });
        }

        // 2. Add landing_page_id to landing_sections (nullable for existing rows)
        if (Schema::hasTable('landing_sections') && ! Schema::hasColumn('landing_sections', 'landing_page_id')) {
            Schema::table('landing_sections', function (Blueprint $table) {
                $table->foreignId('landing_page_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('landing_pages')
                    ->cascadeOnDelete();
            });
        }

        // 3. Migrate existing sections to a "Home" landing page
        if (Schema::hasTable('landing_sections')) {
            $existingCount = DB::table('landing_sections')->count();

            if ($existingCount > 0) {
                // Create the "Home" landing page (slug: home)
                $homePageId = DB::table('landing_pages')->insertGetId([
                    'name'       => 'Home',
                    'slug'       => 'home',
                    'is_home'    => true,
                    'is_active'  => true,
                    'meta_title' => null,
                    'meta_description' => null,
                    'settings'   => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Assign all existing sections to the Home page
                DB::table('landing_sections')->update(['landing_page_id' => $homePageId]);
            }
        }

        // 4. Now make landing_page_id NOT NULL (if there are rows) and drop the old global unique on type
        // We do this after migrating data
        if (Schema::hasTable('landing_sections')) {
            // Drop the old unique constraint on type (if it exists)
            try {
                Schema::table('landing_sections', function (Blueprint $table) {
                    $table->dropUnique(['type']);
                });
            } catch (\Exception $e) {
                // Constraint may not exist or may have a different name — skip
            }

            // Add new unique constraint: (landing_page_id, type)
            try {
                Schema::table('landing_sections', function (Blueprint $table) {
                    $table->unique(['landing_page_id', 'type'], 'unique_page_section_type');
                });
            } catch (\Exception $e) {
                // Already exists — skip
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('landing_sections')) {
            try {
                Schema::table('landing_sections', function (Blueprint $table) {
                    $table->dropUnique('unique_page_section_type');
                });
            } catch (\Exception $e) {
            }

            try {
                Schema::table('landing_sections', function (Blueprint $table) {
                    $table->unique('type');
                });
            } catch (\Exception $e) {
            }

            Schema::table('landing_sections', function (Blueprint $table) {
                $table->dropConstrainedForeignId('landing_page_id');
            });
        }

        Schema::dropIfExists('landing_pages');
    }
};
