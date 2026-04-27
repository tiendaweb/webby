<?php

use App\Models\SystemSetting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;

return new class extends Migration
{
    /**
     * Mapping of deprecated event names to new event names.
     */
    protected array $eventMappings = [
        'subscription_created' => 'subscription_activated',
        'payment_received' => 'payment_completed',
    ];

    /**
     * Events to remove (unimplemented).
     */
    protected array $eventsToRemove = [
        'payment_failed',
        'project_created',
        'project_published',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $setting = SystemSetting::where('key', 'admin_notification_events')->first();

        if (! $setting) {
            return;
        }

        $events = $setting->value;

        if (is_string($events)) {
            $events = json_decode($events, true) ?? [];
        }

        if (! is_array($events)) {
            return;
        }

        // Map deprecated events to new names
        $updatedEvents = [];
        foreach ($events as $event) {
            if (isset($this->eventMappings[$event])) {
                // Map to new event name if not already present
                $newEvent = $this->eventMappings[$event];
                if (! in_array($newEvent, $updatedEvents)) {
                    $updatedEvents[] = $newEvent;
                }
            } elseif (! in_array($event, $this->eventsToRemove)) {
                // Keep event if it's not in the removal list
                if (! in_array($event, $updatedEvents)) {
                    $updatedEvents[] = $event;
                }
            }
            // Events in eventsToRemove are silently dropped
        }

        // Update the setting
        $setting->value = json_encode($updatedEvents);
        $setting->save();

        // Clear cache
        Cache::forget('setting.admin_notification_events');
        Cache::forget('settings.group.email');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is not safely reversible as we don't know
        // which events were originally present before the migration.
        // The data transformation is one-way.
    }
};
