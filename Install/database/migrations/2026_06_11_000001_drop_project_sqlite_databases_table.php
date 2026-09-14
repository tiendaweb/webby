<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('sqlite_databases');
    }

    public function down(): void
    {
        // Project-scoped SQLite databases were removed from the product surface.
        // Restoring this migration intentionally does not recreate user data files.
    }
};
