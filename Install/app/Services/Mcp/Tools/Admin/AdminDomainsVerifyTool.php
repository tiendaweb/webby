<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\DomainVerificationService;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;

class AdminDomainsVerifyTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(protected DomainVerificationService $verification) {}

    public function name(): string
    {
        return 'admin_domains_verify';
    }

    public function description(): string
    {
        return 'Check the DNS of a project\'s custom domain now and, if it resolves, mark it verified and start its certificate. '
            .'DNS changes take time to spread, so a failure right after editing the records is normal — wait and call again.';
    }

    public function requiredAbility(): ?string
    {
        return 'projects:write';
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
            return ['success' => false, 'message' => 'This project has no custom domain to verify. Set one with admin_domains_set.'];
        }

        $resultado = $this->verification->verify($project);
        $fresco = $project->fresh();

        return [
            'success' => true,
            'domain' => $fresco->custom_domain,
            'verified' => (bool) $fresco->custom_domain_verified,
            'ssl_status' => $fresco->custom_domain_ssl_status,
            'result' => $resultado,
        ];
    }
}
