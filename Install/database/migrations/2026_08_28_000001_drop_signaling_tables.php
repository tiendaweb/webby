<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retira la señalización WebRTC propia.
 *
 * Se había construido para que un juego publicado pudiera emparejar dos
 * navegadores sin depender de Firebase. El juego que la motivó (tank.aapp.pro)
 * pasó a usar el broker público de PeerJS, que hace ese mismo apretón de manos
 * sin base de datos ni API propia, así que estas tablas quedaron sin un solo
 * lector.
 *
 * El `down()` las reconstruye tal como estaban, por si alguna vez hace falta
 * volver a una señalización propia.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Primero los mensajes: tienen la clave foránea hacia las salas.
        Schema::dropIfExists('signaling_messages');
        Schema::dropIfExists('signaling_rooms');
    }

    public function down(): void
    {
        Schema::create('signaling_rooms', function (Blueprint $table) {
            $table->id();
            $table->string('code', 12)->unique();
            $table->uuid('project_id')->nullable()->index();
            $table->string('host_peer_id', 40);
            $table->json('peers')->nullable();
            $table->timestamp('last_activity_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('signaling_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('signaling_rooms')->cascadeOnDelete();
            $table->string('from_peer_id', 40);
            $table->string('to_peer_id', 40)->nullable();
            $table->string('type', 24);
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index(['room_id', 'id']);
        });
    }
};
