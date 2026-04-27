<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;

class AuditLogService
{
    /**
     * Log a data export request.
     */
    public static function logDataExport(User $user): AuditLog
    {
        return AuditLog::log(
            AuditLog::ACTION_DATA_EXPORT,
            $user,
            $user,
            User::class,
            $user->id,
            null,
            null,
            ['event' => 'requested']
        );
    }

    /**
     * Log an account deletion request.
     */
    public static function logAccountDeletionRequested(User $user): AuditLog
    {
        return AuditLog::log(
            AuditLog::ACTION_ACCOUNT_DELETION,
            $user,
            $user,
            User::class,
            $user->id,
            null,
            null,
            ['event' => 'requested']
        );
    }

    /**
     * Log an account deletion cancellation.
     */
    public static function logAccountDeletionCancelled(User $user): AuditLog
    {
        return AuditLog::log(
            AuditLog::ACTION_ACCOUNT_DELETION,
            $user,
            $user,
            User::class,
            $user->id,
            null,
            null,
            ['event' => 'cancelled']
        );
    }

    /**
     * Log a completed account deletion.
     */
    public static function logAccountDeleted(int $userId, string $email): AuditLog
    {
        return AuditLog::log(
            AuditLog::ACTION_ACCOUNT_DELETION,
            null, // User is now deleted
            null,
            User::class,
            $userId,
            ['email' => $email],
            null,
            ['event' => 'completed']
        );
    }

    /**
     * Log a consent change.
     */
    public static function logConsentChanged(
        User $user,
        string $consentType,
        bool $oldValue,
        bool $newValue
    ): AuditLog {
        return AuditLog::log(
            AuditLog::ACTION_CONSENT_CHANGE,
            $user,
            $user,
            User::class,
            $user->id,
            ['consented' => $oldValue, 'type' => $consentType],
            ['consented' => $newValue, 'type' => $consentType],
            null
        );
    }

    /**
     * Log an admin action on a user.
     */
    public static function logAdminAction(
        User $targetUser,
        User $admin,
        string $action,
        ?array $oldValues = null,
        ?array $newValues = null
    ): AuditLog {
        return AuditLog::log(
            AuditLog::ACTION_ADMIN_ACTION,
            $targetUser,
            $admin,
            User::class,
            $targetUser->id,
            $oldValues,
            $newValues,
            ['admin_action' => $action]
        );
    }

    /**
     * Log a login event.
     */
    public static function logLogin(User $user): AuditLog
    {
        return AuditLog::log(
            AuditLog::ACTION_LOGIN,
            $user,
            $user,
            User::class,
            $user->id
        );
    }

    /**
     * Log a logout event.
     */
    public static function logLogout(User $user): AuditLog
    {
        return AuditLog::log(
            AuditLog::ACTION_LOGOUT,
            $user,
            $user,
            User::class,
            $user->id
        );
    }
}
