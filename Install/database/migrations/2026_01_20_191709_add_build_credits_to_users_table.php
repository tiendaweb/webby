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
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'build_credits')) {
                $table->bigInteger('build_credits')->default(0);
            }
            if (! Schema::hasColumn('users', 'credits_reset_at')) {
                $table->timestamp('credits_reset_at')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['build_credits', 'credits_reset_at']);
        });
    }
};
