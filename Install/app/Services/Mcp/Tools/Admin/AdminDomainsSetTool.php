<?php

namespace App\Services\Mcp\Tools\Admin;

use App\Services\DomainSettingService;
use App\Services\Mcp\Concerns\ResolvesAdminTargets;
use App\Services\Mcp\McpTool;
use App\Services\DomainVerificationService;
use App\Support\CustomDomainHelper;

class AdminDomainsSetTool extends McpTool
{
    use ResolvesAdminTargets;

    public function __construct(
        protected DomainVerificationService $verification,
        protected DomainSettingService $settings,
    ) {}

    public function name(): string
    {
        return 'admin_domains_set';
    }

    public function description(): string
    {
        return 'Point a custom domain at a project, or clear it with remove=true. '
            .'Setting a domain marks it unverified and returns the DNS records to create; call admin_domains_verify once they are in place.';
    }

    public function requiredAbility(): ?string
    {
        return 'projects:write';
    }

    public function inputSchema(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_id' => ['type' => 'string', 'description' => 'Project id or subdomain.'],
                'domain' => ['type' => 'string', 'maxLength' => 255, 'description' => 'e.g. "tienda.ejemplo.com". Required unless remove=true.'],
                'remove' => ['type' => 'boolean', 'default' => false, 'description' => 'Detach the current custom domain.'],
            ],
            'required' => ['project_id'],
        ];
    }

    public function handle(array $arguments, mixed $context): array
    {
        $project = $this->resolveProject($arguments);

        if ($arguments['remove'] ?? false) {
            $anterior = $project->custom_domain;
            $project->update([
                'custom_domain' => null,
                'custom_domain_verified' => false,
                'custom_domain_ssl_status' => null,
                'custom_domain_verified_at' => null,
            ]);

            return ['success' => true, 'message' => $anterior
                ? "Removed {$anterior} from {$project->name}."
                : 'This project had no custom domain.'];
        }

        if (! $this->settings->isCustomDomainsEnabled()) {
            return ['success' => false, 'message' => 'Custom domains are not enabled on this platform.'];
        }

        $dominio = CustomDomainHelper::normalize((string) ($arguments['domain'] ?? ''));

        // Las mismas comprobaciones que hace la pantalla, en el mismo orden:
        // una herramienta que acepta lo que la interfaz rechaza deja el sitio
        // en un estado que después nadie sabe arreglar desde el panel.
        if ($errores = CustomDomainHelper::validate($dominio)) {
            return ['success' => false, 'message' => $errores[0]];
        }

        $base = $this->settings->getBaseDomain();

        if ($base && CustomDomainHelper::isSubdomainOfBase($dominio, $base)) {
            return ['success' => false, 'message' => "You cannot use the platform base domain ({$base}) as a custom domain. Publish to a subdomain instead."];
        }

        if (! CustomDomainHelper::isAvailable($dominio, $project->id)) {
            return ['success' => false, 'message' => "{$dominio} is already in use by another project."];
        }

        $project->update([
            'custom_domain' => $dominio,
            'custom_domain_verified' => false,
            'custom_domain_ssl_status' => null,
            'custom_domain_verified_at' => null,
        ]);

        return [
            'success' => true,
            'message' => "{$dominio} attached to {$project->name}. Create the DNS records below, then call admin_domains_verify.",
            'domain' => $dominio,
            'dns_instructions' => $this->verification->getVerificationInstructions($project->fresh()),
        ];
    }
}
