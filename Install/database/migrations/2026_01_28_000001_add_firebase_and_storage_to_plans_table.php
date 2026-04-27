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
        Schema::table('plans', function (Blueprint $table) {
            // Firebase settings
            if (! Schema::hasColumn('plans', 'enable_firebase')) {
                $table->boolean('enable_firebase')->default(false)->after('allow_private_visibility');
            }
            if (! Schema::hasColumn('plans', 'allow_user_firebase_config')) {
                $table->boolean('allow_user_firebase_config')->default(false)->after('enable_firebase');
            }

            // File storage settings
            if (! Schema::hasColumn('plans', 'enable_file_storage')) {
                $table->boolean('enable_file_storage')->default(false)->after('allow_user_firebase_config');
            }
            if (! Schema::hasColumn('plans', 'max_storage_mb')) {
                $table->unsignedBigInteger('max_storage_mb')->nullable()->after('enable_file_storage');
            }
            if (! Schema::hasColumn('plans', 'max_file_size_mb')) {
                $table->unsignedInteger('max_file_size_mb')->default(10)->after('max_storage_mb');
            }
            if (! Schema::hasColumn('plans', 'allowed_file_types')) {
                $table->json('allowed_file_types')->nullable()->after('max_file_size_mb');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn([
                'enable_firebase',
                'allow_user_firebase_config',
                'enable_file_storage',
                'max_storage_mb',
                'max_file_size_mb',
                'allowed_file_types',
            ]);
        });
    }
};
