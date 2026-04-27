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
        if (Schema::hasColumn('builders', 'total_builds_processed')) {
            Schema::table('builders', function (Blueprint $table) {
                $table->dropColumn('total_builds_processed');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('builders', function (Blueprint $table) {
            $table->integer('total_builds_processed')->default(0);
        });
    }
};
