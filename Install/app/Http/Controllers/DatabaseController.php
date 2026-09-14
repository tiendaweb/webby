<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DatabaseController extends Controller
{
    /**
     * Display the global database management page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user?->isAdmin(), 403);

        return Inertia::render('Database/Index', [
            'user' => $user->only('id', 'name', 'email', 'avatar', 'role'),
        ]);
    }
}
