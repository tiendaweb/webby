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
        $addSlug = ! Schema::hasColumn('templates', 'slug');

        Schema::table('templates', function (Blueprint $table) use ($addSlug) {
            if ($addSlug) {
                $table->string('slug')->nullable()->after('id');
            }
            if (! Schema::hasColumn('templates', 'version')) {
                $table->string('version')->default('1.0.0')->after('category');
            }
            if (! Schema::hasColumn('templates', 'zip_path')) {
                $table->string('zip_path')->nullable()->after('thumbnail');
            }
            if (! Schema::hasColumn('templates', 'metadata')) {
                $table->json('metadata')->nullable()->after('zip_path');
            }
        });

        // Make slug unique after adding nullable
        if ($addSlug) {
            Schema::table('templates', function (Blueprint $table) {
                $table->unique('slug');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('templates', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn(['slug', 'version', 'zip_path', 'metadata']);
        });
    }
};
