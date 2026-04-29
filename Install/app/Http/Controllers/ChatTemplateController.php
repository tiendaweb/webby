<?php

namespace App\Http\Controllers;

use App\Models\ChatTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChatTemplateController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $templates = ChatTemplate::query()
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->orWhereIn('visibility', [ChatTemplate::VISIBILITY_ACCOUNT, ChatTemplate::VISIBILITY_TEAM]);
            })
            ->latest()
            ->get();

        return Inertia::render('Chat/Templates/Index', [
            'templates' => $templates,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'system_prompt' => 'nullable|string',
            'starter_prompt' => 'nullable|string',
            'variables_json' => 'nullable|array',
            'visibility' => 'required|in:private,account,team',
            'provider_preferences' => 'nullable|array',
        ]);

        $validated['user_id'] = $request->user()->id;
        ChatTemplate::create($validated);

        return back()->with('success', 'Template created successfully.');
    }

    public function update(Request $request, ChatTemplate $chatTemplate): RedirectResponse
    {
        abort_unless($chatTemplate->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'system_prompt' => 'nullable|string',
            'starter_prompt' => 'nullable|string',
            'variables_json' => 'nullable|array',
            'visibility' => 'required|in:private,account,team',
            'provider_preferences' => 'nullable|array',
        ]);

        $chatTemplate->update($validated);

        return back()->with('success', 'Template updated successfully.');
    }

    public function destroy(Request $request, ChatTemplate $chatTemplate): RedirectResponse
    {
        abort_unless($chatTemplate->user_id === $request->user()->id, 403);
        $chatTemplate->delete();

        return back()->with('success', 'Template deleted successfully.');
    }
}
