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
        if (! Schema::hasTable('plan_template')) {
            Schema::create('plan_template', function (Blueprint $table) {
                $table->id();
                $table->foreignId('plan_id')->constrained()->cascadeOnDelete();
                $table->foreignId('template_id')->constrained()->cascadeOnDelete();
                $table->timestamps();

                $table->unique(['plan_id', 'template_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plan_template');
    }
};
