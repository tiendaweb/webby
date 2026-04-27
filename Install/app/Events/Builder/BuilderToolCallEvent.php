<?php

namespace App\Events\Builder;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BuilderToolCallEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $sessionId,
        public string $id,
        public string $tool,
        public array $params
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('session.'.$this->sessionId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'tool_call';
    }

    public function broadcastWith(): array
    {
        $params = $this->params;
        $encoded = json_encode($params);
        if ($encoded === false || strlen($encoded) > 8000) {
            $params = ['_truncated' => true];
        }

        return [
            'id' => $this->id,
            'tool' => $this->tool,
            'params' => $params,
        ];
    }
}
