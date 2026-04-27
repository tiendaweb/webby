<?php

namespace App\Services;

use App\Events\UserNotificationEvent;
use App\Models\Project;
use App\Models\Subscription;
use App\Models\Transaction;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Support\Collection;

class NotificationService
{
    /**
     * Create and broadcast a notification to a user.
     */
    public function notify(
        User $user,
        string $type,
        string $title,
        string $message,
        ?array $data = null,
        ?string $actionUrl = null
    ): UserNotification {
        $notification = UserNotification::create([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'action_url' => $actionUrl,
        ]);

        event(new UserNotificationEvent($notification));

        return $notification;
    }

    /**
     * Notify user about build completion.
     */
    public function notifyBuildComplete(User $user, Project $project): UserNotification
    {
        return $this->notify(
            $user,
            UserNotification::TYPE_BUILD_COMPLETE,
            __('Build Complete'),
            __('Your project has been built successfully.'),
            ['project_id' => $project->id, 'project_name' => $project->name],
            "/project/{$project->id}"
        );
    }

    /**
     * Notify user about build failure.
     */
    public function notifyBuildFailed(User $user, Project $project, string $error): UserNotification
    {
        return $this->notify(
            $user,
            UserNotification::TYPE_BUILD_FAILED,
            __('Build Failed'),
            __('Your project build has failed.'),
            ['project_id' => $project->id, 'project_name' => $project->name, 'error' => $error],
            "/project/{$project->id}"
        );
    }

    /**
     * Notify user about low credits.
     * Only sends if no recent notification exists (within 24 hours).
     */
    public function notifyCreditsLow(User $user): ?UserNotification
    {
        // Check if a recent notification exists
        $recentNotification = UserNotification::where('user_id', $user->id)
            ->where('type', UserNotification::TYPE_CREDITS_LOW)
            ->where('created_at', '>', now()->subDay())
            ->exists();

        if ($recentNotification) {
            return null;
        }

        return $this->notify(
            $user,
            UserNotification::TYPE_CREDITS_LOW,
            __('Credits Running Low'),
            __('You have less than 20% of your monthly credits remaining.'),
            null,
            '/billing'
        );
    }

    /**
     * Notify user about subscription renewal.
     */
    public function notifySubscriptionRenewed(User $user, Subscription $subscription): UserNotification
    {
        return $this->notify(
            $user,
            UserNotification::TYPE_SUBSCRIPTION_RENEWED,
            __('Subscription Renewed'),
            __('Your subscription has been renewed successfully.'),
            ['subscription_id' => $subscription->id, 'plan_name' => $subscription->plan?->name],
            '/billing'
        );
    }

    /**
     * Notify user about subscription expiration.
     */
    public function notifySubscriptionExpired(User $user, Subscription $subscription): UserNotification
    {
        return $this->notify(
            $user,
            UserNotification::TYPE_SUBSCRIPTION_EXPIRED,
            __('Subscription Expired'),
            __('Your subscription has expired.'),
            ['subscription_id' => $subscription->id, 'plan_name' => $subscription->plan?->name],
            '/billing'
        );
    }

    /**
     * Notify user about payment completion.
     */
    public function notifyPaymentCompleted(User $user, Transaction $transaction): UserNotification
    {
        return $this->notify(
            $user,
            UserNotification::TYPE_PAYMENT_COMPLETED,
            __('Payment Completed'),
            __('Your payment has been processed successfully.'),
            ['transaction_id' => $transaction->id, 'amount' => $transaction->amount],
            '/billing'
        );
    }

    /**
     * Notify user about domain verification.
     */
    public function notifyDomainVerified(User $user, Project $project): UserNotification
    {
        return $this->notify(
            $user,
            UserNotification::TYPE_DOMAIN_VERIFIED,
            __('Domain Verified'),
            __('Your custom domain has been verified.'),
            ['project_id' => $project->id, 'domain' => $project->custom_domain],
            "/project/{$project->id}"
        );
    }

    /**
     * Notify user about SSL provisioning completion.
     */
    public function notifySslProvisioned(User $user, Project $project): UserNotification
    {
        return $this->notify(
            $user,
            UserNotification::TYPE_SSL_PROVISIONED,
            __('SSL Certificate Ready'),
            __('SSL certificate has been provisioned for your domain.'),
            ['project_id' => $project->id, 'domain' => $project->custom_domain],
            "/project/{$project->id}"
        );
    }

    /**
     * Get unread notification count for user.
     */
    public function getUnreadCount(User $user): int
    {
        return UserNotification::where('user_id', $user->id)
            ->whereNotIn('type', ['build_complete', 'build_failed'])
            ->unread()
            ->count();
    }

    /**
     * Get recent notifications for user.
     */
    public function getNotifications(User $user, int $limit = 20): Collection
    {
        return UserNotification::where('user_id', $user->id)
            ->whereNotIn('type', ['build_complete', 'build_failed'])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }

    /**
     * Mark all notifications as read for user.
     */
    public function markAllAsRead(User $user): void
    {
        UserNotification::where('user_id', $user->id)
            ->unread()
            ->update(['read_at' => now()]);
    }
}
