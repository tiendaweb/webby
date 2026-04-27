<?php

namespace App\Http\Controllers;

use App\Models\Template;
use App\Services\BroadcastService;
use App\Services\InternalAiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CreateController extends Controller
{
    public function __construct(
        protected InternalAiService $internalAiService,
        protected BroadcastService $broadcastService
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        // Get recent projects
        $recentProjects = $user->projects()
            ->orderByDesc('last_viewed_at')
            ->limit(5)
            ->get();

        // Get starred projects
        $starredProjects = $user->projects()
            ->where('is_starred', true)
            ->get();

        // Get shared projects
        $sharedProjects = $user->sharedProjects()
            ->with('user:id,name,avatar')
            ->get();

        // Get templates available for user's plan (includes system templates)
        $templates = Template::forPlan($user->getCurrentPlan())->get();

        // Check if broadcast credentials are configured (not connection test - that happens on start)
        $isBroadcastConfigured = $this->broadcastService->isConfigured();

        // Block demo admin from creating projects
        if (config('app.demo') && Auth::id() === 1) {
            $canBuildResult = [
                'allowed' => false,
                'reason' => 'The demo admin account cannot create projects. Register your own account to test the AI website builder.',
            ];
        } else {
            // Check build credit status for frontend
            $buildCreditService = app(\App\Services\BuildCreditService::class);
            $canBuildResult = $buildCreditService->canPerformBuild($user);
        }

        // Get user's first name for greeting
        $firstName = explode(' ', $user->name)[0];

        // Use locale-aware static content for immediate render - AI content loads via AJAX
        $locale = app()->getLocale();
        $staticGreetings = InternalAiService::getStaticGreetings($locale);
        $randomIndex = random_int(0, count($staticGreetings) - 1);
        $greeting = str_replace('{name}', $firstName, $staticGreetings[$randomIndex]);

        return Inertia::render('Create', [
            'user' => $user->only('id', 'name', 'email', 'avatar', 'role'),
            'recentProjects' => $recentProjects,
            'starredProjects' => $starredProjects,
            'sharedProjects' => $sharedProjects,
            'templates' => $templates,
            'isPusherConfigured' => $isBroadcastConfigured,
            'canCreateProject' => $canBuildResult['allowed'],
            'cannotCreateReason' => $canBuildResult['reason'],
            'suggestions' => InternalAiService::getStaticSuggestions($locale),
            'typingPrompts' => InternalAiService::getStaticTypingPrompts($locale),
            'greeting' => $greeting,
            'firstName' => $firstName,
        ]);
    }

    /**
     * Fetch AI-powered content asynchronously.
     */
    public function aiContent(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();
        $firstName = explode(' ', $user->name)[0];

        $suggestions = $this->internalAiService->getSuggestions(4);
        $typingPrompts = $this->internalAiService->getTypingPrompts(8);
        $greetings = $this->internalAiService->getGreeting(4);

        // Pick a random greeting and replace {name}
        if (! empty($greetings)) {
            $randomIndex = random_int(0, count($greetings) - 1);
            $greeting = str_replace('{name}', $firstName, $greetings[$randomIndex]);
        } else {
            $greeting = "What do you want to build, {$firstName}?";
        }

        return response()->json([
            'suggestions' => $suggestions,
            'typingPrompts' => $typingPrompts,
            'greeting' => $greeting,
        ]);
    }

    /**
     * Fetch AI-powered content for landing page (public, no auth).
     */
    public function landingAiContent(): \Illuminate\Http\JsonResponse
    {
        $suggestions = $this->internalAiService->getSuggestions(4);
        $typingPrompts = $this->internalAiService->getTypingPrompts(8);
        $headlines = $this->internalAiService->getHeroHeadlines(4);
        $subtitles = $this->internalAiService->getHeroSubtitles(4);

        return response()->json([
            'suggestions' => $suggestions,
            'typingPrompts' => $typingPrompts,
            'headline' => ! empty($headlines) ? $headlines[array_rand($headlines)] : InternalAiService::STATIC_HERO_HEADLINES[0],
            'subtitle' => ! empty($subtitles) ? $subtitles[array_rand($subtitles)] : InternalAiService::STATIC_HERO_SUBTITLES[0],
        ]);
    }
}
