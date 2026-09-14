<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('sqlite_databases')) {
            Schema::create('sqlite_databases', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->uuid('project_id')->nullable();
                $table->string('name');
                $table->string('filename');
                $table->string('path');
                $table->unsignedBigInteger('size_bytes')->default(0);
                $table->timestamps();

                $table->index(['user_id', 'project_id']);
                $table->unique(['user_id', 'filename']);
                $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('sqlite_databases');
    }
};
