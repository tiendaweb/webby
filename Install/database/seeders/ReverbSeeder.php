<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class ReverbSeeder extends Seeder
{
    /**
     * Seed Reverb broadcast settings for local development.
     *
     * All broadcast config is managed via admin/settings (system_settings table).
     * This seeder provides sensible defaults for local development.
     */
    public function run(): void
    {
        if (app()->environment('local')) {
            SystemSetting::setMany([
                'broadcast_driver' => 'reverb',
                'reverb_app_id' => '123456',
                'reverb_key' => '123456',
                'reverb_secret' => '123456',
                'reverb_host' => '192.168.1.10',
                'reverb_port' => 8002,
                'reverb_scheme' => 'http',
            ], 'integrations');

            $this->command->info('Reverb broadcast settings seeded for local development (192.168.1.10:8002).');
        }
    }
}
