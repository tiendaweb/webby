<?php

namespace App\Services;

use App\Models\User;
use ZipArchive;

class DataExportService
{
    protected User $user;

    protected string $exportPath;

    public function __construct(User $user)
    {
        $this->user = $user;
        $this->exportPath = storage_path("app/exports/{$user->id}");
    }

    /**
     * Generate a complete data export for the user.
     */
    public function generate(): string
    {
        // Create export directory
        if (! file_exists($this->exportPath)) {
            mkdir($this->exportPath, 0755, true);
        }

        // Generate individual data files
        $this->exportProfile();
        $this->exportProjects();
        $this->exportConsents();
        $this->exportSubscriptions();
        $this->exportTransactions();
        $this->exportAuditLogs();

        // Create ZIP archive
        $zipPath = $this->createZipArchive();

        // Clean up individual files
        $this->cleanup();

        return $zipPath;
    }

    /**
     * Export user profile data.
     */
    protected function exportProfile(): void
    {
        $data = [
            'id' => $this->user->id,
            'name' => $this->user->name,
            'email' => $this->user->email,
            'avatar' => $this->user->avatar,
            'role' => $this->user->role,
            'status' => $this->user->status,
            'email_verified_at' => $this->user->email_verified_at?->toIso8601String(),
            'created_at' => $this->user->created_at->toIso8601String(),
            'updated_at' => $this->user->updated_at->toIso8601String(),
        ];

        $this->writeJson('profile.json', $data);
    }

    /**
     * Export user projects.
     */
    protected function exportProjects(): void
    {
        $projects = $this->user->projects()
            ->withTrashed()
            ->get()
            ->map(function ($project) {
                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'description' => $project->description,
                    'thumbnail' => $project->thumbnail,
                    'is_public' => $project->is_public,
                    'is_starred' => $project->is_starred,
                    'status' => $project->status,
                    'last_viewed_at' => $project->last_viewed_at?->toIso8601String(),
                    'created_at' => $project->created_at->toIso8601String(),
                    'updated_at' => $project->updated_at->toIso8601String(),
                    'deleted_at' => $project->deleted_at?->toIso8601String(),
                ];
            })
            ->toArray();

        $this->writeJson('projects.json', $projects);

        // Also export shared projects
        $sharedProjects = $this->user->sharedProjects()
            ->get()
            ->map(function ($project) {
                return [
                    'id' => $project->id,
                    'name' => $project->name,
                    'permission' => $project->pivot->permission,
                    'shared_at' => $project->pivot->created_at?->toIso8601String(),
                ];
            })
            ->toArray();

        $this->writeJson('shared_projects.json', $sharedProjects);
    }

    /**
     * Export user consents.
     */
    protected function exportConsents(): void
    {
        $consents = $this->user->consents()
            ->get()
            ->map(function ($consent) {
                return [
                    'type' => $consent->consent_type,
                    'consented' => $consent->consented,
                    'ip_address' => $consent->ip_address,
                    'created_at' => $consent->created_at->toIso8601String(),
                    'updated_at' => $consent->updated_at->toIso8601String(),
                ];
            })
            ->toArray();

        $this->writeJson('consents.json', $consents);
    }

    /**
     * Export user subscriptions.
     */
    protected function exportSubscriptions(): void
    {
        $subscriptions = $this->user->subscriptions()
            ->with('plan')
            ->get()
            ->map(function ($subscription) {
                return [
                    'id' => $subscription->id,
                    'plan_name' => $subscription->plan?->name,
                    'status' => $subscription->status,
                    'starts_at' => $subscription->starts_at?->toIso8601String(),
                    'ends_at' => $subscription->ends_at?->toIso8601String(),
                    'cancelled_at' => $subscription->cancelled_at?->toIso8601String(),
                    'created_at' => $subscription->created_at->toIso8601String(),
                ];
            })
            ->toArray();

        $this->writeJson('subscriptions.json', $subscriptions);
    }

    /**
     * Export user transactions.
     */
    protected function exportTransactions(): void
    {
        $transactions = $this->user->transactions()
            ->get()
            ->map(function ($transaction) {
                return [
                    'id' => $transaction->id,
                    'type' => $transaction->type,
                    'amount' => $transaction->amount,
                    'currency' => $transaction->currency,
                    'status' => $transaction->status,
                    'description' => $transaction->description,
                    'created_at' => $transaction->created_at->toIso8601String(),
                ];
            })
            ->toArray();

        $this->writeJson('transactions.json', $transactions);
    }

    /**
     * Export user audit logs.
     */
    protected function exportAuditLogs(): void
    {
        $auditLogs = $this->user->auditLogs()
            ->get()
            ->map(function ($log) {
                return [
                    'action' => $log->action,
                    'entity_type' => $log->entity_type,
                    'entity_id' => $log->entity_id,
                    'old_values' => $log->old_values,
                    'new_values' => $log->new_values,
                    'metadata' => $log->metadata,
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at->toIso8601String(),
                ];
            })
            ->toArray();

        $this->writeJson('audit_logs.json', $auditLogs);
    }

    /**
     * Write data to a JSON file.
     */
    protected function writeJson(string $filename, array $data): void
    {
        $path = "{$this->exportPath}/{$filename}";
        file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    /**
     * Create a ZIP archive of all exported data.
     */
    protected function createZipArchive(): string
    {
        $zipPath = storage_path("app/exports/user_{$this->user->id}_data_export.zip");

        $zip = new ZipArchive;
        $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        // Add a README file
        $readme = $this->generateReadme();
        $zip->addFromString('README.txt', $readme);

        // Add all JSON files
        $files = glob("{$this->exportPath}/*.json");
        foreach ($files as $file) {
            $zip->addFile($file, basename($file));
        }

        $zip->close();

        return $zipPath;
    }

    /**
     * Generate README content for the export.
     */
    protected function generateReadme(): string
    {
        $siteName = \App\Models\SystemSetting::get('site_name', config('app.name'));
        $date = now()->toDateTimeString();

        return <<<README
{$siteName} - Personal Data Export
=================================

Export Date: {$date}
User: {$this->user->name} ({$this->user->email})

Contents:
---------
- profile.json: Your account information
- projects.json: Projects you have created
- shared_projects.json: Projects shared with you
- consents.json: Your consent preferences
- subscriptions.json: Your subscription history
- transactions.json: Your payment/transaction history
- audit_logs.json: Activity logs related to your account

This export was generated in compliance with GDPR data portability requirements.

For any questions, please contact us through the application.
README;
    }

    /**
     * Clean up temporary export files.
     */
    protected function cleanup(): void
    {
        $files = glob("{$this->exportPath}/*.json");
        foreach ($files as $file) {
            unlink($file);
        }

        if (is_dir($this->exportPath)) {
            rmdir($this->exportPath);
        }
    }

    /**
     * Get the path for storing exports.
     */
    public static function getExportStoragePath(): string
    {
        return storage_path('app/exports');
    }
}
