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
        Schema::table('builders', function (Blueprint $table) {
            if (! Schema::hasColumn('builders', 'max_iterations')) {
                $table->unsignedSmallInteger('max_iterations')->default(20)->after('status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('builders', function (Blueprint $table) {
            $table->dropColumn('max_iterations');
        });
    }
};
