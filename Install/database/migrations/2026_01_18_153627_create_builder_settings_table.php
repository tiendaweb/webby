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
        if (! Schema::hasTable('builder_settings')) {
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
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('builder_settings');
    }
};
