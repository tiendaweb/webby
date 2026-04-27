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
        Schema::table('projects', function (Blueprint $table) {
            if (! Schema::hasColumn('projects', 'custom_domain')) {
                $table->string('custom_domain', 255)->nullable()->unique()->after('subdomain');
                $table->index('custom_domain');
            }
            if (! Schema::hasColumn('projects', 'custom_domain_verified')) {
                $table->boolean('custom_domain_verified')->default(false)->after('custom_domain');
            }
            if (! Schema::hasColumn('projects', 'custom_domain_ssl_status')) {
                $table->string('custom_domain_ssl_status', 20)->nullable()->after('custom_domain_verified');
            }
            if (! Schema::hasColumn('projects', 'domain_verification_token')) {
                $table->string('domain_verification_token', 64)->nullable()->after('custom_domain_ssl_status');
            }
            if (! Schema::hasColumn('projects', 'custom_domain_verified_at')) {
                $table->timestamp('custom_domain_verified_at')->nullable()->after('domain_verification_token');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropIndex(['custom_domain']);
            $table->dropColumn([
                'custom_domain',
                'custom_domain_verified',
                'custom_domain_ssl_status',
                'domain_verification_token',
                'custom_domain_verified_at',
            ]);
        });
    }
};
