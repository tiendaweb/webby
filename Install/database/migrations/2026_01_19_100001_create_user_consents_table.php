<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('user_consents')) {
            Schema::create('user_consents', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('consent_type'); // marketing, third_party, privacy_policy, terms, cookies
                $table->boolean('consented')->default(false);
                $table->string('version')->nullable(); // Policy version at time of consent
                $table->ipAddress('ip_address')->nullable();
                $table->text('user_agent')->nullable();
                $table->timestamp('consented_at')->nullable();
                $table->timestamp('withdrawn_at')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'consent_type']);
                $table->index(['user_id', 'consent_type', 'consented']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_consents');
    }
};
