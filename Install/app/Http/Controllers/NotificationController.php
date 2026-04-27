<?php

namespace App\Http\Controllers;

use App\Models\UserNotification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(
        private NotificationService $notificationService
    ) {}

    /**
     * Get user notifications.
     */
    public function index(Request $request): JsonResponse
    {
        $limit = $request->input('limit', 20);

        $notifications = $this->notificationService->getNotifications(
            $request->user(),
            min($limit, 50)
        );

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $this->notificationService->getUnreadCount($request->user()),
        ]);
    }

    /**
     * Mark a notification as read.
     */
    public function markAsRead(Request $request, int $notificationId): JsonResponse
    {
        $notification = UserNotification::where('id', $notificationId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $notification) {
            return response()->json(['message' => 'Notification not found'], 404);
        }

        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'unread_count' => $this->notificationService->getUnreadCount($request->user()),
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $this->notificationService->markAllAsRead($request->user());

        return response()->json([
            'success' => true,
            'unread_count' => 0,
        ]);
    }
}
