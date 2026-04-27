<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Builder session channel - public channel for now (no auth required)
// Sessions are identified by UUID so guessing is impractical
Broadcast::channel('session.{sessionId}', function () {
    return true;
});
