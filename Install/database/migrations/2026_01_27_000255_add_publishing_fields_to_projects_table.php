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
        Schema::table('projects', function (Blueprint $table) {
            if (! Schema::hasColumn('projects', 'subdomain')) {
                $table->string('subdomain', 63)->unique()->nullable()->after('is_starred');
                $table->index('subdomain');
            }
            if (! Schema::hasColumn('projects', 'published_title')) {
                $table->string('published_title')->nullable()->after('subdomain');
            }
            if (! Schema::hasColumn('projects', 'published_description')) {
                $table->string('published_description', 150)->nullable()->after('published_title');
            }
            if (! Schema::hasColumn('projects', 'published_visibility')) {
                $table->string('published_visibility', 10)->default('public')->after('published_description');
            }
            if (! Schema::hasColumn('projects', 'share_image')) {
                $table->string('share_image')->nullable()->after('published_visibility');
            }
            if (! Schema::hasColumn('projects', 'published_at')) {
                $table->timestamp('published_at')->nullable()->after('share_image');
                $table->index('published_at');
            }
            if (! Schema::hasColumn('projects', 'custom_instructions')) {
                $table->string('custom_instructions', 500)->nullable()->after('published_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex(['subdomain']);
            $table->dropIndex(['published_at']);
            $table->dropColumn([
                'subdomain',
                'published_title',
                'published_description',
                'published_visibility',
                'share_image',
                'published_at',
                'custom_instructions',
            ]);
        });
    }
};
