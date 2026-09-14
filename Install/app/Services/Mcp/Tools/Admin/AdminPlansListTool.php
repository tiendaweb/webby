<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Models\Plan;
use App\Services\Mcp\McpTool;

class AdminPlansListTool extends McpTool
{
    public function name(): string
    {
        return 'admin_plans_list';
    }

    public function description(): string
    {
        return 'List subscription plans (account-wide, not AI Connector modules — see admin_connector_modules_list for those).';
    }

    public function requiredAbility(): ?string
    {
        return 'plans:read';
    }

    public function inputSchema(): array
    {
        return ['type' => 'object', 'properties' => new \stdClass];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $plans = Plan::withCount(['subscriptions as active_subscribers_count' => fn ($q) => $q->where('status', 'active')])
            ->orderBy('sort_order')
            ->get();

        return [
            'success' => true,
            'plans' => $plans->map(fn (Plan $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'price' => (float) $p->price,
                'billing_period' => $p->billing_period,
                'is_active' => $p->is_active,
                'active_subscribers_count' => $p->active_subscribers_count,
            ])->values()->all(),
        ];
    }
}
