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
        if (! Schema::hasTable('builders')) {
            Schema::create('builders', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('url');
                $table->integer('port')->default(8080);
                $table->string('server_key')->unique();
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->timestamp('last_triggered_at')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('builders');
    }
};
