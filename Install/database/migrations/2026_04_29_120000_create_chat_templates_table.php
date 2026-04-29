<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('chat_templates')) {
            Schema::create('chat_templates', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->text('system_prompt')->nullable();
                $table->text('starter_prompt')->nullable();
                $table->json('variables_json')->nullable();
                $table->string('visibility', 20)->default('private');
                $table->json('provider_preferences')->nullable();
                $table->timestamps();
            });
        }

        Schema::table('projects', function (Blueprint $table) {
            if (! Schema::hasColumn('projects', 'chat_template_id')) {
                $table->foreignId('chat_template_id')->nullable()->after('template_id')->constrained('chat_templates')->nullOnDelete();
            }
            if (! Schema::hasColumn('projects', 'chat_template_snapshot')) {
                $table->json('chat_template_snapshot')->nullable()->after('chat_template_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            if (Schema::hasColumn('projects', 'chat_template_id')) {
                $table->dropForeign(['chat_template_id']);
                $table->dropColumn('chat_template_id');
            }
            if (Schema::hasColumn('projects', 'chat_template_snapshot')) {
                $table->dropColumn('chat_template_snapshot');
            }
        });

        Schema::dropIfExists('chat_templates');
    }
};
