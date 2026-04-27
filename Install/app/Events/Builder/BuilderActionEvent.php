<?php

namespace App\Events\Builder;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

// TODO: Implement ShouldBroadcast for Reverb support.
// Currently, these events are streamed directly via Pusher from the Go builder.
// When migrating to Reverb, add: implements ShouldBroadcast
// with broadcastOn(), broadcastAs(), broadcastWith() methods.
class BuilderActionEvent
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $sessionId,
        public string $action,
        public string $target,
        public string $details,
        public string $category
    ) {}
}
