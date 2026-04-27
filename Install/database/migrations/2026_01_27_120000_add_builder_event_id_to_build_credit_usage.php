<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('build_credit_usage', function (Blueprint $table) {
            if (! Schema::hasColumn('build_credit_usage', 'builder_event_id')) {
                $table->string('builder_event_id', 64)->nullable()->after('id');
                $table->unique('builder_event_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('build_credit_usage', function (Blueprint $table) {
            $table->dropUnique(['builder_event_id']);
            $table->dropColumn('builder_event_id');
        });
    }
};
