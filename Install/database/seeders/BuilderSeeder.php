<?php

namespace Database\Seeders;

use App\Models\Builder;
use Illuminate\Database\Seeder;

class BuilderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create a local builder
        Builder::firstOrCreate(
            ['name' => 'Local Builder'],
            [
                'name' => 'Local Builder',
                'url' => 'http://localhost',
                'port' => 8846,
                'server_key' => '123456',
                'status' => 'active',
                'max_iterations' => 50,
            ]
        );
    }
}
