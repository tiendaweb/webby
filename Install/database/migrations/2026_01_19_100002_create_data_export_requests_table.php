<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('data_export_requests')) {
            Schema::create('data_export_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->enum('status', ['pending', 'processing', 'completed', 'failed', 'expired'])->default('pending');
                $table->string('file_path')->nullable(); // Storage path to ZIP file
                $table->bigInteger('file_size')->nullable();
                $table->string('download_token', 64)->unique()->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->text('error_message')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'status']);
                $table->index('download_token');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('data_export_requests');
    }
};
