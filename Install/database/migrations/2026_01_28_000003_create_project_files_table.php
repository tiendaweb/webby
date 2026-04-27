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
        if (! Schema::hasTable('project_files')) {
            Schema::create('project_files', function (Blueprint $table) {
                $table->id();
                $table->uuid('project_id');
                $table->string('filename');
                $table->string('original_filename');
                $table->string('path');
                $table->string('mime_type');
                $table->unsignedBigInteger('size');
                $table->string('source')->default('dashboard'); // 'dashboard' | 'app'
                $table->string('checksum')->nullable();
                $table->timestamps();

                $table->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
                $table->index(['project_id', 'path']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_files');
    }
};
