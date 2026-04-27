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
            if (! Schema::hasColumn('projects', 'firebase_config')) {
                $table->text('firebase_config')->nullable()->after('custom_instructions');
            }
            if (! Schema::hasColumn('projects', 'uses_system_firebase')) {
                $table->boolean('uses_system_firebase')->default(true)->after('firebase_config');
            }
            if (! Schema::hasColumn('projects', 'storage_used_bytes')) {
                $table->unsignedBigInteger('storage_used_bytes')->default(0)->after('uses_system_firebase');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn([
                'firebase_config',
                'uses_system_firebase',
                'storage_used_bytes',
            ]);
        });
    }
};
