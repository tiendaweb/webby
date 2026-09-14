<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\AiConnectorModule;
use App\Services\Mcp\McpTool;

class AdminConnectorModulesListTool extends McpTool
{
    public function name(): string
    {
        return 'admin_connector_modules_list';
    }

    public function description(): string
    {
        return 'List the sellable AI Connector module catalog (e.g. "Conector IA") with pricing and active-project counts.';
    }

    public function requiredAbility(): ?string
    {
        return 'connectors:manage';
    }

    public function inputSchema(): array
    {
        return ['type' => 'object', 'properties' => new \stdClass];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $modules = AiConnectorModule::withCount([
            'activations as active_count' => fn ($q) => $q->where('status', 'active'),
        ])->orderBy('sort_order')->get();

        return [
            'success' => true,
            'modules' => $modules->map(fn (AiConnectorModule $m) => [
                'id' => $m->id,
                'name' => $m->name,
                'slug' => $m->slug,
                'pricing_type' => $m->pricing_type,
                'price' => (float) $m->price,
                'is_active' => $m->is_active,
                'tool_scope' => $m->tool_scope,
                'active_projects_count' => $m->active_count,
            ])->values()->all(),
        ];
    }
}
