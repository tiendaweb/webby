<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lets a Transaction record an AI Connector purchase/renewal instead of a
 * Plan subscription. subscription_id is already nullable for this exact
 * reason (see app/Models/Transaction.php); this adds the parallel nullable
 * FK. Exactly one of subscription_id / ai_connector_activation_id should be
 * set per row — enforced at the application layer, matching the existing
 * subscription_id convention (no DB-level check constraint).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('ai_connector_activation_id')->nullable()
                ->after('subscription_id')
                ->constrained('project_ai_connector_activations')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ai_connector_activation_id');
        });
    }
};
