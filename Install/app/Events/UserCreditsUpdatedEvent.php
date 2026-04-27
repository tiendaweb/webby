<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserCreditsUpdatedEvent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $userId,
        public int $remaining,
        public int $monthlyLimit,
        public bool $isUnlimited,
        public bool $usingOwnKey
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('App.Models.User.'.$this->userId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'credits.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'remaining' => $this->remaining,
            'monthlyLimit' => $this->monthlyLimit,
            'isUnlimited' => $this->isUnlimited,
            'usingOwnKey' => $this->usingOwnKey,
        ];
    }
}
