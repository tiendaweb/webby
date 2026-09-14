<?php

namespace Database\Seeders;

use App\Models\AiConnectorModule;
use Illuminate\Database\Seeder;

class AiConnectorModuleSeeder extends Seeder
{
    public function run(): void
    {
        AiConnectorModule::firstOrCreate(
            ['slug' => AiConnectorModule::SLUG_AI_CONNECTOR],
            [
                'name' => 'Conector IA',
                'description' => 'Da acceso de lectura y escritura completo al proyecto vía un servidor MCP propio, para que el cliente use Claude, ChatGPT o Grok como asistente sobre su sitio.',
                'pricing_type' => AiConnectorModule::PRICING_MONTHLY,
                'price' => 10.00,
                'is_active' => true,
                'tool_scope' => ['files', 'firebase', 'settings', 'publish'],
                'sort_order' => 0,
            ]
        );
    }
}
