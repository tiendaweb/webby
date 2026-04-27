<?php

namespace App\Services;

use App\Models\Project;

class DomainVerificationService
{
    protected DomainSettingService $settingService;

    protected NotificationService $notificationService;

    public function __construct(DomainSettingService $settingService, NotificationService $notificationService)
    {
        $this->settingService = $settingService;
        $this->notificationService = $notificationService;
    }

    /**
     * Get verification instructions for a project's custom domain.
     * Uses A record verification — user points domain to the server IP.
     */
    public function getVerificationInstructions(Project $project): array
    {
        $serverIp = $this->settingService->getServerIp();

        return [
            'method' => 'a_record',
            'record_type' => 'A',
            'host' => $project->custom_domain,
            'value' => $serverIp ?? 'YOUR_SERVER_IP',
        ];
    }

    /**
     * Verify a project's custom domain via A record lookup.
     *
     * @return array{success: bool, error: ?string}
     */
    public function verify(Project $project): array
    {
        if (! $project->custom_domain) {
            return [
                'success' => false,
                'error' => 'No custom domain configured for this project.',
            ];
        }

        return $this->verifyARecord($project);
    }

    /**
     * Verify domain by checking if its A record points to the configured server IP.
     */
    protected function verifyARecord(Project $project): array
    {
        $serverIp = $this->settingService->getServerIp();

        if (! $serverIp) {
            return [
                'success' => false,
                'error' => 'Server IP not configured. Please contact the administrator.',
            ];
        }

        if ($this->checkDnsARecord($project->custom_domain, $serverIp)) {
            $project->update([
                'custom_domain_verified' => true,
                'custom_domain_verified_at' => now(),
                'custom_domain_ssl_status' => $this->settingService->usesLetsEncrypt() ? 'pending' : null,
            ]);

            // Notify user about successful domain verification
            if ($project->user) {
                $this->notificationService->notifyDomainVerified($project->user, $project);
            }

            return [
                'success' => true,
                'error' => null,
            ];
        }

        return [
            'success' => false,
            'error' => "A record not found. Please add an A record pointing {$project->custom_domain} to {$serverIp}.",
        ];
    }

    /**
     * Check if domain has an A record pointing to the expected IP.
     */
    protected function checkDnsARecord(string $domain, string $expectedIp): bool
    {
        try {
            $records = dns_get_record($domain, DNS_A);

            if (! $records) {
                return false;
            }

            $expectedIp = trim($expectedIp);

            foreach ($records as $record) {
                if (isset($record['ip']) && trim($record['ip']) === $expectedIp) {
                    return true;
                }
            }

            return false;
        } catch (\Exception $e) {
            return false;
        }
    }
}
