<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop tables that reference projects (fresh start)
        Schema::dropIfExists('project_shares');
        Schema::dropIfExists('build_credit_usage');
        Schema::dropIfExists('projects');

        // Recreate projects with UUID primary key
        if (! Schema::hasTable('projects')) {
            Schema::create('projects', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('name');
                $table->text('description')->nullable();
                $table->text('initial_prompt')->nullable();
                $table->string('thumbnail')->nullable();
                $table->boolean('is_public')->default(false);
                $table->boolean('is_starred')->default(false);
                $table->timestamp('last_viewed_at')->nullable();
                $table->foreignId('builder_id')->nullable()->constrained()->nullOnDelete();
                $table->string('build_session_id')->nullable();
                $table->string('build_status')->nullable();
                $table->string('build_path')->nullable();
                $table->timestamp('build_started_at')->nullable();
                $table->timestamp('build_completed_at')->nullable();
                $table->json('conversation_history')->nullable();
                $table->integer('estimated_tokens')->default(0);
                $table->softDeletes();
                $table->timestamps();
            });
        }

        // Recreate project_shares with UUID foreign key
        if (! Schema::hasTable('project_shares')) {
            Schema::create('project_shares', function (Blueprint $table) {
                $table->id();
                $table->uuid('project_id');
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->enum('permission', ['view', 'edit', 'admin'])->default('view');
                $table->timestamps();

                $table->foreign('project_id')->references('id')->on('projects')->onDelete('cascade');
                $table->unique(['project_id', 'user_id']);
            });
        }

        // Recreate build_credit_usage with UUID foreign key
        if (! Schema::hasTable('build_credit_usage')) {
            Schema::create('build_credit_usage', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->uuid('project_id')->nullable();
                $table->foreignId('ai_provider_id')->nullable()->constrained()->nullOnDelete();
                $table->string('model');
                $table->integer('prompt_tokens')->default(0);
                $table->integer('completion_tokens')->default(0);
                $table->integer('total_tokens')->default(0);
                $table->decimal('estimated_cost', 10, 6)->default(0);
                $table->string('action')->nullable();
                $table->timestamps();

                $table->foreign('project_id')->references('id')->on('projects')->nullOnDelete();
                $table->index(['user_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('build_credit_usage');
        Schema::dropIfExists('project_shares');
        Schema::dropIfExists('projects');
    }
};
