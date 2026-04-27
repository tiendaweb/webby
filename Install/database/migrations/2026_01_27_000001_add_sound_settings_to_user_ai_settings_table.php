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
        Schema::table('user_ai_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('user_ai_settings', 'sounds_enabled')) {
                $table->boolean('sounds_enabled')->default(true);
            }
            if (! Schema::hasColumn('user_ai_settings', 'sound_style')) {
                $table->string('sound_style')->default('playful');
            }
            if (! Schema::hasColumn('user_ai_settings', 'sound_volume')) {
                $table->unsignedTinyInteger('sound_volume')->default(100);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_ai_settings', function (Blueprint $table) {
            $table->dropColumn(['sounds_enabled', 'sound_style', 'sound_volume']);
        });
    }
};
