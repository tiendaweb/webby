<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\AiConnectorModule;
use App\Services\Mcp\McpTool;
use Illuminate\Support\Facades\Validator;

/**
 * The admin-configurable pricing surface the user asked for: modules
 * sellable one-time, monthly, or yearly, price set per module (default
 * "Conector IA" seeded at $10/month — see AiConnectorModuleSeeder).
 */
class AdminConnectorModulesUpsertTool extends McpTool
{
    public function name(): string
    {
        return 'admin_connector_modules_upsert';
    }

    public function description(): string
    {
        return 'Create or update a sellable AI Connector module: name, slug, description, pricing_type (one_time|monthly|yearly), price, is_active.';
    }

    public function requiredAbility(): ?string
    {
        return 'connectors:manage';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'module_id' => ['type' => 'integer', 'description' => 'Omit to create a new module.'],
                'name' => ['type' => 'string'],
                'slug' => ['type' => 'string'],
                'description' => ['type' => 'string'],
                'pricing_type' => ['type' => 'string', 'enum' => ['one_time', 'monthly', 'yearly']],
                'price' => ['type' => 'number', 'minimum' => 0],
                'is_active' => ['type' => 'boolean'],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $moduleId = $arguments['module_id'] ?? null;
        $module = $moduleId ? AiConnectorModule::find((int) $moduleId) : null;

        if ($moduleId && ! $module) {
            return ['success' => false, 'message' => 'Module not found.'];
        }

        $validator = Validator::make($arguments, [
            'name' => [$module ? 'sometimes' : 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', 'unique:ai_connector_modules,slug'.($module ? ",{$module->id}" : '')],
            'description' => ['sometimes', 'nullable', 'string'],
            'pricing_type' => [$module ? 'sometimes' : 'required', 'in:one_time,monthly,yearly'],
            'price' => [$module ? 'sometimes' : 'required', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return ['success' => false, 'message' => $validator->errors()->first()];
        }

        $validated = $validator->validated();

        if ($module) {
            $module->update($validated);
        } else {
            $validated['slug'] = $validated['slug'] ?? \Illuminate\Support\Str::slug($validated['name']);
            $validated['is_active'] = $validated['is_active'] ?? true;
            $module = AiConnectorModule::create($validated);
        }

        return ['success' => true, 'module' => $module->fresh()->only(['id', 'name', 'slug', 'pricing_type', 'price', 'is_active'])];
    }
}
