<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->enum('type', ['ai', 'blank'])->default('ai')->after('user_id');
            $table->index('type');
        });

        DB::table('projects')
            ->where('initial_prompt', '[Blank Project - Manual Setup]')
            ->update(['type' => 'blank']);
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex(['type']);
            $table->dropColumn('type');
        });
    }
};
