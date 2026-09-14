<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Plan;
use App\Services\Mcp\McpTool;
use Illuminate\Support\Facades\Validator;

/**
 * Covers the core commercial fields of a Plan. Deliberately does not expose
 * the full feature-flag/limit column set (monthly_build_credits,
 * max_projects, enable_*, etc.) in Phase 1-2 — those are numerous and
 * higher-blast-radius; add as a follow-up tool once there's real demand.
 */
class AdminPlansUpdateTool extends McpTool
{
    public function name(): string
    {
        return 'admin_plans_update';
    }

    public function description(): string
    {
        return 'Update a subscription plan\'s name, description, price, billing_period (monthly|yearly|lifetime), or is_active flag.';
    }

    public function requiredAbility(): ?string
    {
        return 'plans:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'plan_id' => ['type' => 'integer'],
                'name' => ['type' => 'string'],
                'description' => ['type' => 'string'],
                'price' => ['type' => 'number', 'minimum' => 0],
                'billing_period' => ['type' => 'string', 'enum' => ['monthly', 'yearly', 'lifetime']],
                'is_active' => ['type' => 'boolean'],
            ],
            'required' => ['plan_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $plan = Plan::find((int) ($arguments['plan_id'] ?? 0));

        if (! $plan) {
            return ['success' => false, 'message' => 'Plan not found.'];
        }

        $fields = array_intersect_key($arguments, array_flip(['name', 'description', 'price', 'billing_period', 'is_active']));

        $validator = Validator::make($fields, [
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'billing_period' => ['sometimes', 'in:monthly,yearly,lifetime'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if ($validator->fails()) {
            return ['success' => false, 'message' => $validator->errors()->first()];
        }

        $plan->update($validator->validated());

        return ['success' => true, 'plan' => $plan->fresh()->only(['id', 'name', 'price', 'billing_period', 'is_active'])];
    }
}
