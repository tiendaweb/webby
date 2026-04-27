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
            // Primary AI provider
            if (! Schema::hasColumn('plans', 'ai_provider_id')) {
                $table->foreignId('ai_provider_id')
                    ->nullable()
                    ->constrained('ai_providers')
                    ->nullOnDelete();
            }

            // Fallback AI providers (JSON array of IDs, ordered by priority)
            if (! Schema::hasColumn('plans', 'fallback_ai_provider_ids')) {
                $table->json('fallback_ai_provider_ids')->nullable();
            }

            // Primary builder
            if (! Schema::hasColumn('plans', 'builder_id')) {
                $table->foreignId('builder_id')
                    ->nullable()
                    ->constrained('builders')
                    ->nullOnDelete();
            }

            // Fallback builders (JSON array of IDs, ordered by priority)
            if (! Schema::hasColumn('plans', 'fallback_builder_ids')) {
                $table->json('fallback_builder_ids')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ai_provider_id');
            $table->dropColumn('fallback_ai_provider_ids');
            $table->dropConstrainedForeignId('builder_id');
            $table->dropColumn('fallback_builder_ids');
        });
    }
};
