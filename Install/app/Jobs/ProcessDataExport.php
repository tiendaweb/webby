<?php

namespace App\Jobs;

use App\Models\DataExportRequest;
use App\Models\User;
use App\Notifications\DataExportReadyNotification;
use App\Services\AuditLogService;
use App\Services\DataExportService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class ProcessDataExport implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 60;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public DataExportRequest $exportRequest
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $user = $this->exportRequest->user;

        if (! $user) {
            Log::warning('ProcessDataExport: User not found for export request', [
                'export_request_id' => $this->exportRequest->id,
            ]);

            return;
        }

        try {
            // Mark as processing
            $this->exportRequest->markAsProcessing();

            // Generate the export
            $exportService = new DataExportService($user);
            $zipPath = $exportService->generate();

            // Store the file path and mark as completed
            $this->exportRequest->markAsCompleted($zipPath);

            // Log the export
            AuditLogService::logDataExport($user);

            // Notify the user
            $user->notify(new DataExportReadyNotification($this->exportRequest));

            Log::info('ProcessDataExport: Export completed successfully', [
                'user_id' => $user->id,
                'export_request_id' => $this->exportRequest->id,
            ]);
        } catch (\Exception $e) {
            Log::error('ProcessDataExport: Export failed', [
                'user_id' => $user->id,
                'export_request_id' => $this->exportRequest->id,
                'error' => $e->getMessage(),
            ]);

            $this->exportRequest->markAsFailed($e->getMessage());

            throw $e;
        }
    }
}
