<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('cron_logs')) {
            Schema::create('cron_logs', function (Blueprint $table) {
                $table->id();
                $table->string('job_name');
                $table->string('job_class');
                $table->enum('status', ['success', 'failed', 'running'])->default('running');
                $table->timestamp('started_at');
                $table->timestamp('completed_at')->nullable();
                $table->integer('duration')->nullable(); // seconds
                $table->string('triggered_by', 50)->default('cron'); // cron|manual:user_id
                $table->text('message')->nullable();
                $table->text('exception')->nullable();
                $table->timestamps();

                $table->index(['job_name', 'started_at']);
                $table->index('status');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('cron_logs');
    }
};
