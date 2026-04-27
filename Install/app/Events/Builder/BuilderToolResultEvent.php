<?php

namespace App\Events\Builder;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BuilderToolResultEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $sessionId,
        public string $id,
        public string $tool,
        public bool $success,
        public string $output,
        public int $durationMs = 0,
        public int $iteration = 0,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('session.'.$this->sessionId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'tool_result';
    }

    public function broadcastWith(): array
    {
        $output = $this->output;
        if (strlen($output) > 8000) {
            $output = mb_strcut($output, 0, 8000, 'UTF-8')."\n\n[truncated]";
        }

        return [
            'id' => $this->id,
            'tool' => $this->tool,
            'success' => $this->success,
            'output' => $output,
            'duration_ms' => $this->durationMs,
            'iteration' => $this->iteration,
        ];
    }
}
