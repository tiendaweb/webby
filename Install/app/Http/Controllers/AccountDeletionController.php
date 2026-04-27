<?php

namespace App\Http\Controllers;

use App\Models\AccountDeletionRequest;
use App\Models\SystemSetting;
use App\Models\User;
use App\Notifications\AccountDeletionCancelledNotification;
use App\Notifications\AccountDeletionScheduledNotification;
use App\Services\AuditLogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AccountDeletionController extends Controller
{
    /**
     * Request account deletion.
     */
    public function request(Request $request): RedirectResponse
    {
        // Check if account deletion is enabled
        if (! SystemSetting::get('account_deletion_enabled', true)) {
            return back()->with('error', 'Account deletion is currently disabled. Please contact support.');
        }

        if (session('impersonating_from')) {
            return back()->withErrors(['error' => 'This action is not allowed while impersonating a user.']);
        }

        $user = $request->user();

        // Prevent deletion of the super admin (first admin account)
        if ($user->id === 1) {
            return back()->with('error', 'The super admin account cannot be deleted.');
        }

        // Check if there's already a pending request
        if (AccountDeletionRequest::hasPendingRequest($user)) {
            return back()->with('error', 'You already have a pending account deletion request.');
        }

        // Create deletion request
        $deletionRequest = AccountDeletionRequest::createForUser($user);

        // Log the action
        AuditLogService::logAccountDeletionRequested($user);

        // Notify the user
        $user->notify(new AccountDeletionScheduledNotification($deletionRequest));

        return back()->with(
            'message',
            'Account deletion has been scheduled. You will receive an email with instructions to cancel if you change your mind.'
        );
    }

    /**
     * Cancel account deletion (via email link).
     */
    public function cancel(string $token): RedirectResponse
    {
        $deletionRequest = AccountDeletionRequest::findByCancellationToken($token);

        if (! $deletionRequest) {
            return redirect()->route('login')
                ->with('error', 'Invalid cancellation link.');
        }

        if (! $deletionRequest->canBeCancelled()) {
            return redirect()->route('login')
                ->with('error', 'This deletion request can no longer be cancelled.');
        }

        $user = $deletionRequest->user;

        // Cancel the request
        $deletionRequest->cancel();

        // Log the action
        if ($user) {
            AuditLogService::logAccountDeletionCancelled($user);

            // Notify the user
            $user->notify(new AccountDeletionCancelledNotification);
        }

        return redirect()->route('login')
            ->with('message', 'Your account deletion has been cancelled. Your account and data are safe.');
    }
}
