<?php

namespace App\Notifications;

use App\Models\ProjectAiConnectorActivation;
use App\Traits\HandlesLocale;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Mirrors SubscriptionExpiredNotification's shape/channel, but for a
 * per-project AI Connector activation instead of an account-wide Plan
 * subscription. Uses a plain MailMessage (no dedicated Blade view) to keep
 * this self-contained.
 */
class AiConnectorExpiredNotification extends Notification implements ShouldQueue
{
    use HandlesLocale, Queueable;

    public function __construct(public ProjectAiConnectorActivation $activation) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return $this->withLocale($this->getNotifiableLocale($notifiable), function () {
            $projectName = $this->activation->project?->name ?? 'your project';

            return (new MailMessage)
                ->subject(__('Your AI Connector subscription has expired'))
                ->line(__('The AI Connector for ":project" has expired and its access tokens have been revoked.', ['project' => $projectName]))
                ->line(__('Reactivate it from the project settings to keep using it.'))
                ->action(__('Go to my projects'), route('projects.index'));
        });
    }

    public function toArray(object $notifiable): array
    {
        return [
            'ai_connector_activation_id' => $this->activation->id,
            'project_id' => $this->activation->project_id,
            'status' => 'expired',
        ];
    }
}
