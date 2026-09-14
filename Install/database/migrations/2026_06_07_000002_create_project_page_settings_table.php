<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_page_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->string('page_path', 500);
            $table->string('title')->nullable();
            $table->string('description', 180)->nullable();
            $table->string('slug', 180)->nullable();
            $table->string('canonical_url')->nullable();
            $table->string('social_image')->nullable();
            $table->string('favicon')->nullable();
            $table->boolean('indexable')->default(true);
            $table->timestamps();

            $table->unique(['project_id', 'page_path']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_page_settings');
    }
};
