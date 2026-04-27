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
        if (! Schema::hasTable('landing_sections')) {
            Schema::create('landing_sections', function (Blueprint $table) {
                $table->id();
                $table->string('type', 50)->unique();
                $table->unsignedInteger('sort_order')->default(0);
                $table->boolean('is_enabled')->default(true);
                $table->json('settings')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('landing_contents')) {
            Schema::create('landing_contents', function (Blueprint $table) {
                $table->id();
                $table->foreignId('section_id')->constrained('landing_sections')->cascadeOnDelete();
                $table->string('locale', 10);
                $table->string('field', 100);
                $table->text('value')->nullable();
                $table->timestamps();

                $table->unique(['section_id', 'locale', 'field'], 'unique_content');
                $table->index(['section_id', 'locale'], 'idx_section_locale');
            });
        }

        if (! Schema::hasTable('landing_items')) {
            Schema::create('landing_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('section_id')->constrained('landing_sections')->cascadeOnDelete();
                $table->string('locale', 10);
                $table->char('item_key', 36); // UUID format
                $table->unsignedInteger('sort_order')->default(0);
                $table->boolean('is_enabled')->default(true);
                $table->json('data');
                $table->timestamps();

                $table->unique(['section_id', 'locale', 'item_key'], 'unique_item');
                $table->index(['section_id', 'locale'], 'idx_items_section_locale');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('landing_items');
        Schema::dropIfExists('landing_contents');
        Schema::dropIfExists('landing_sections');
    }
};
