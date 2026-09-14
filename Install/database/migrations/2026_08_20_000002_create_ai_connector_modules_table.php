<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin-configurable catalog of sellable per-project modules. Phase 1 ships
 * a single seeded row ("Conector IA" / ai-connector, $10/month) but the
 * schema is generic so future modules can be added without a new table.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_connector_modules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            // one_time, monthly, yearly (see AiConnectorModule::PRICING_* constants)
            $table->string('pricing_type')->default('monthly');
            $table->decimal('price', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            // Array of tool-category keys this module grants access to, e.g. ['files','firebase'].
            $table->json('tool_scope')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_connector_modules');
    }
};
