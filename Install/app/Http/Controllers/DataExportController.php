<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessDataExport;
use App\Models\DataExportRequest;
use App\Models\SystemSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DataExportController extends Controller
{
    /**
     * Request a data export.
     */
    public function request(Request $request): RedirectResponse
    {
        // Check if data export is enabled
        if (! SystemSetting::get('data_export_enabled', true)) {
            return back()->with('error', 'Data export is currently disabled.');
        }

        $user = $request->user();

        // Check rate limiting
        if (! DataExportRequest::canUserRequestExport($user)) {
            $hoursRemaining = DataExportRequest::hoursUntilNextExport($user);

            return back()->with(
                'error',
                "You can request another data export in {$hoursRemaining} hours."
            );
        }

        // Create export request
        $exportRequest = DataExportRequest::createForUser($user);

        // Dispatch job to process the export
        ProcessDataExport::dispatch($exportRequest);

        return back()->with(
            'message',
            'Your data export has been requested. You will receive an email when it\'s ready for download.'
        );
    }

    /**
     * Download a completed data export.
     */
    public function download(string $token): BinaryFileResponse|RedirectResponse
    {
        $exportRequest = DataExportRequest::where('download_token', $token)->first();

        if (! $exportRequest) {
            return redirect()->route('profile.edit')
                ->with('error', 'Invalid download link.');
        }

        if ($exportRequest->isExpired()) {
            return redirect()->route('profile.edit')
                ->with('error', 'This download link has expired. Please request a new export.');
        }

        if (! $exportRequest->isDownloadable()) {
            return redirect()->route('profile.edit')
                ->with('error', 'This export is not ready for download yet.');
        }

        if (! file_exists($exportRequest->file_path)) {
            return redirect()->route('profile.edit')
                ->with('error', 'Export file not found. Please request a new export.');
        }

        $fileName = "data_export_{$exportRequest->user_id}_{$exportRequest->created_at->format('Y-m-d')}.zip";

        return response()->download($exportRequest->file_path, $fileName);
    }
}
