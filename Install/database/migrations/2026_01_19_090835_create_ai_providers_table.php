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
        // Drop the old builder_settings table
        Schema::dropIfExists('builder_settings');

        // Create the new ai_providers table
        if (! Schema::hasTable('ai_providers')) {
            Schema::create('ai_providers', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('type', 50); // 'openai'
                $table->text('credentials')->nullable(); // encrypted JSON: {api_key: '...'}
                $table->json('config')->nullable(); // {base_url, default_model, max_tokens}
                $table->json('available_models')->nullable(); // ['gpt-4o', 'gpt-4o-mini', ...]
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->boolean('is_default')->default(false);
                $table->timestamp('last_used_at')->nullable();
                $table->unsignedInteger('total_requests')->default(0);
                $table->timestamps();

                $table->index('type');
                $table->index('status');
                $table->index('is_default');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_providers');

        // Recreate the builder_settings table for rollback
        Schema::create('builder_settings', function (Blueprint $table) {
            $table->id();
            $table->string('category')->index();
            $table->string('key')->index();
            $table->text('value')->nullable();
            $table->string('type')->default('string');
            $table->boolean('is_sensitive')->default(false);
            $table->timestamps();

            $table->unique(['category', 'key']);
        });
    }
};
