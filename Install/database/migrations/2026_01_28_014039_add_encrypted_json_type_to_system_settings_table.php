<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For SQLite: We need to recreate the table since SQLite doesn't support ALTER COLUMN for enum
        // For MySQL: We can use ALTER COLUMN

        if (DB::getDriverName() === 'sqlite') {
            // SQLite: Check constraint is just part of the column definition in the schema
            // The column type check happens at application level, not DB level for SQLite
            // Since enum in Laravel for SQLite uses CHECK constraint, we need to recreate the table

            // Create a temp table with new structure
            DB::statement('CREATE TABLE system_settings_temp (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                "key" VARCHAR(255) UNIQUE,
                value TEXT,
                type VARCHAR(255) DEFAULT \'string\' CHECK (type IN (\'string\', \'integer\', \'boolean\', \'json\', \'encrypted_json\')),
                "group" VARCHAR(255),
                created_at DATETIME,
                updated_at DATETIME
            )');

            // Copy data
            DB::statement('INSERT INTO system_settings_temp SELECT * FROM system_settings');

            // Drop old table
            DB::statement('DROP TABLE system_settings');

            // Rename temp table
            DB::statement('ALTER TABLE system_settings_temp RENAME TO system_settings');

            // Recreate indexes
            DB::statement('CREATE UNIQUE INDEX system_settings_key_unique ON system_settings ("key")');
            DB::statement('CREATE INDEX system_settings_group_index ON system_settings ("group")');
        } else {
            // MySQL: Modify the enum column
            DB::statement("ALTER TABLE system_settings MODIFY COLUMN type ENUM('string', 'integer', 'boolean', 'json', 'encrypted_json') DEFAULT 'string'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            // Create a temp table with old structure
            DB::statement('CREATE TABLE system_settings_temp (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                "key" VARCHAR(255) UNIQUE,
                value TEXT,
                type VARCHAR(255) DEFAULT \'string\' CHECK (type IN (\'string\', \'integer\', \'boolean\', \'json\')),
                "group" VARCHAR(255),
                created_at DATETIME,
                updated_at DATETIME
            )');

            // Copy data (excluding encrypted_json rows since they won't fit)
            DB::statement("INSERT INTO system_settings_temp SELECT * FROM system_settings WHERE type != 'encrypted_json'");

            // Drop old table
            DB::statement('DROP TABLE system_settings');

            // Rename temp table
            DB::statement('ALTER TABLE system_settings_temp RENAME TO system_settings');

            // Recreate indexes
            DB::statement('CREATE UNIQUE INDEX system_settings_key_unique ON system_settings ("key")');
            DB::statement('CREATE INDEX system_settings_group_index ON system_settings ("group")');
        } else {
            // MySQL: Modify the enum column back
            DB::statement("ALTER TABLE system_settings MODIFY COLUMN type ENUM('string', 'integer', 'boolean', 'json') DEFAULT 'string'");
        }
    }
};
