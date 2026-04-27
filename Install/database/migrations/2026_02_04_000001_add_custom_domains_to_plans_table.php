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
        Schema::table('plans', function (Blueprint $table) {
            if (! Schema::hasColumn('plans', 'enable_custom_domains')) {
                $table->boolean('enable_custom_domains')->default(false)->after('allow_private_visibility');
            }
            if (! Schema::hasColumn('plans', 'max_custom_domains_per_user')) {
                $table->integer('max_custom_domains_per_user')->nullable()->after('enable_custom_domains');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['enable_custom_domains', 'max_custom_domains_per_user']);
        });
    }
};
