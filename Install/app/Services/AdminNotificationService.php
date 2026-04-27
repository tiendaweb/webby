<?php

namespace App\Services;

use App\Models\SystemSetting;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as NotificationFacade;

class AdminNotificationService
{
    /**
     * Available notification events.
     */
    public const EVENTS = [
        'user_registered' => 'New user registration',
        'user_deleted' => 'User account deleted',
        'subscription_activated' => 'Subscription activated',
        'subscription_cancelled' => 'Subscription cancelled',
        'subscription_expired' => 'Subscription expired',
        'payment_completed' => 'Payment completed',
        'bank_transfer_pending' => 'Bank transfer pending approval',
    ];

    /**
     * Check if notifications should be sent for a given event.
     */
    public static function shouldNotify(string $event): bool
    {
        $enabledEvents = SystemSetting::get('admin_notification_events', []);

        if (! is_array($enabledEvents)) {
            $enabledEvents = json_decode($enabledEvents, true) ?? [];
        }

        return in_array($event, $enabledEvents);
    }

    /**
     * Get the admin notification email address.
     */
    public static function getAdminEmail(): ?string
    {
        $email = SystemSetting::get('admin_notification_email');

        return ! empty($email) ? $email : null;
    }

    /**
     * Send a notification to the admin if the event is enabled.
     */
    public static function notify(string $event, Notification $notification): void
    {
        if (! static::shouldNotify($event)) {
            return;
        }

        $email = static::getAdminEmail();
        if (! $email) {
            return;
        }

        NotificationFacade::route('mail', $email)->notify($notification);
    }

    /**
     * Get all available notification events.
     */
    public static function getAvailableEvents(): array
    {
        return static::EVENTS;
    }
}
