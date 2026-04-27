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
            if (! Schema::hasColumn('projects', 'builder_id')) {
                $table->foreignId('builder_id')->nullable()->constrained('builders')->nullOnDelete();
            }
            if (! Schema::hasColumn('projects', 'build_session_id')) {
                $table->string('build_session_id')->nullable();
            }
            if (! Schema::hasColumn('projects', 'build_status')) {
                $table->string('build_status')->default('pending');
            }
            if (! Schema::hasColumn('projects', 'build_path')) {
                $table->string('build_path')->nullable();
            }
            if (! Schema::hasColumn('projects', 'build_started_at')) {
                $table->timestamp('build_started_at')->nullable();
            }
            if (! Schema::hasColumn('projects', 'build_completed_at')) {
                $table->timestamp('build_completed_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['builder_id']);
            $table->dropColumn([
                'builder_id',
                'build_session_id',
                'build_status',
                'build_path',
                'build_started_at',
                'build_completed_at',
            ]);
        });
    }
};
