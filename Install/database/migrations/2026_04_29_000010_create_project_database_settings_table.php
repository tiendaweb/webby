<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_database_settings', function (Blueprint $table) {
            $table->id();
            $table->uuid('project_id')->unique();
            $table->string('database_mode')->default('none');
            $table->text('credentials')->nullable();
            $table->json('base_paths')->nullable();
            $table->boolean('is_connected')->default(false);
            $table->timestamp('last_tested_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
            $table->index(['database_mode', 'is_connected']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_database_settings');
    }
};
