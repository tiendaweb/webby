<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\DomainVerificationService;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;

class AdminDomainsGetTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(protected DomainVerificationService $verification) {}

    public function name(): string
    {
        return 'admin_domains_get';
    }

    public function description(): string
    {
        return 'The custom domain of a project: which one, whether DNS is verified, the state of its certificate, '
            .'and the exact DNS records that still need to be created.';
    }

    public function requiredAbility(): ?string
    {
        return 'projects:read';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => ['project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.']],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $this->resolveProject($arguments);

        if (! $project->custom_domain) {
            return [
                'success' => true,
                'project_id' => $project->id,
                'domain' => null,
                'message' => 'This project has no custom domain yet. Set one with admin_domains_set.',
            ];
        }

        return [
            'success' => true,
            'project_id' => $project->id,
            'domain' => $project->custom_domain,
            'verified' => (bool) $project->custom_domain_verified,
            'verified_at' => $project->custom_domain_verified_at?->toIso8601String(),
            'ssl_status' => $project->custom_domain_ssl_status,
            'dns_instructions' => $this->verification->getVerificationInstructions($project),
        ];
    }
}
