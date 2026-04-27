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
            if (! Schema::hasColumn('projects', 'conversation_history')) {
                $table->json('conversation_history')->nullable()->after('build_completed_at');
            }
            if (! Schema::hasColumn('projects', 'estimated_tokens')) {
                $table->unsignedInteger('estimated_tokens')->default(0)->after('conversation_history');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['conversation_history', 'estimated_tokens']);
        });
    }
};
