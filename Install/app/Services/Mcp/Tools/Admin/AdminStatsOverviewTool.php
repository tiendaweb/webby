<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\AdminStatsService;
use App\Services\Mcp\McpTool;

class AdminStatsOverviewTool extends McpTool
{
    public function __construct(protected AdminStatsService $stats) {}

    public function name(): string
    {
        return 'admin_stats_overview';
    }

    public function description(): string
    {
        return 'The whole admin dashboard in one call: users, projects, revenue, subscriptions, AI usage, storage, '
            .'referrals and what is waiting for review. Start here when asked how the platform is doing.';
    }

    public function requiredAbility(): ?string
    {
        return 'settings:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'section' => [
                    'type' => 'string',
                    'enum' => ['all', 'core', 'pending', 'subscriptions', 'ai', 'storage', 'referrals'],
                    'default' => 'all',
                    'description' => 'Narrow the answer when you only need one block.',
                ],
            ],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        // Cada bloque es una consulta propia y algunas son caras. Pedir una
        // sección y devolver las siete es tiempo de base de datos regalado.
        $datos = match ($arguments['section'] ?? 'all') {
            'core' => ['core' => $this->stats->getCoreStats()],
            'pending' => ['pending' => $this->stats->getPendingActions()],
            'subscriptions' => ['subscriptions' => $this->stats->getSubscriptionDistribution()],
            'ai' => ['ai' => $this->stats->getAiUsageStats(), 'ai_by_provider' => $this->stats->getAiUsageByProvider()],
            'storage' => ['storage' => $this->stats->getStorageStats()],
            'referrals' => ['referrals' => $this->stats->getReferralStats()],
            default => $this->stats->getAllStats(),
        };

        return ['success' => true, 'stats' => $datos];
    }
}
