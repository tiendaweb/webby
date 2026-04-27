/**
 * Notification types matching backend UserNotification model constants.
 */
export type NotificationType =
    | 'build_complete'
    | 'build_failed'
    | 'credits_low'
    | 'subscription_renewed'
    | 'subscription_expired'
    | 'payment_completed'
    | 'domain_verified'
    | 'ssl_provisioned'
    | 'project_status';

/**
 * User notification from the API.
 */
export interface UserNotification {
    id: number;
    type: NotificationType;
    title: string;
    message: string;
    data: Record<string, unknown> | null;
    action_url: string | null;
    read_at: string | null;
    created_at: string;
}

/**
 * Real-time credit update event payload.
 */
export interface CreditsUpdatedEvent {
    remaining: number;
    monthlyLimit: number;
    isUnlimited: boolean;
    usingOwnKey: boolean;
}

/**
 * Real-time project status update event payload.
 */
export interface ProjectStatusEvent {
    project_id: string;
    build_status: string;
    build_message: string | null;
}

/**
 * Build credits info for display.
 */
export interface UserCredits {
    remaining: number;
    monthlyLimit: number;
    isUnlimited: boolean;
    usingOwnKey: boolean;
}
