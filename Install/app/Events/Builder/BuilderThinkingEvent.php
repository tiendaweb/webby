<?php

namespace App\Events\Builder;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BuilderThinkingEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $sessionId,
        public string $content,
        public int $iteration
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('session.'.$this->sessionId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'thinking';
    }

    public function broadcastWith(): array
    {
        $content = $this->content;
        if (strlen($content) > 8000) {
            $content = mb_strcut($content, 0, 8000, 'UTF-8')."\n\n[truncated]";
        }

        return [
            'content' => $content,
            'iteration' => $this->iteration,
        ];
    }
}
