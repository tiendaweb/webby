<?php

namespace App\Services;

use App\Models\AiProvider;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class InternalAiService
{
    /**
     * Cache duration in seconds (4 hours - covers each time period).
     */
    protected const CACHE_TTL = 14400;

    /**
     * Default models per provider type (small/cheap models).
     */
    protected const DEFAULT_MODELS = [
        AiProvider::TYPE_OPENAI => 'gpt-4o-mini',
        AiProvider::TYPE_ANTHROPIC => 'claude-haiku-4-5-20251001',
        AiProvider::TYPE_GROK => 'grok-4-1-fast-non-reasoning',
        AiProvider::TYPE_DEEPSEEK => 'deepseek-chat',
        AiProvider::TYPE_ZHIPU => 'glm-4.5-air',
        AiProvider::TYPE_GEMINI => 'gemini-3.1-flash-lite',
        AiProvider::TYPE_NVIDIA => 'nvidia/nemotron-3-nano-30b-a3b',
    ];

    /**
     * Static fallback suggestions.
     */
    public const STATIC_SUGGESTIONS = [
        'Host a portfolio website',
        'Import an existing landing page',
        'Publish a PHP contact site',
        'Edit a React marketing site',
    ];

    /**
     * Static fallback typing prompts.
     */
    public const STATIC_TYPING_PROMPTS = [
        'Upload and host my portfolio website...',
        'Import this landing page and make it responsive...',
        'Create a static site from this HTML...',
        'Publish a PHP contact page with clean styling...',
        'Edit the existing homepage copy and colors...',
        'Turn this Vite app into a hosted site...',
        'Prepare a product page for publishing...',
        'Review this project before publishing...',
    ];

    /**
     * Static fallback greetings.
     */
    public const STATIC_GREETINGS = [
        'What site do you want to host, {name}?',
        'What should we publish, {name}?',
        'What would you like to edit, {name}?',
        'What site can I help you manage, {name}?',
    ];

    /**
     * Static fallback hero headlines for landing page.
     */
    public const STATIC_HERO_HEADLINES = [
        'Host and edit your sites in one place',
        'Publish your website workspace today',
        'Live editing for hosted websites',
        'Bring existing sites under control',
    ];

    /**
     * Static fallback hero subtitles for landing page.
     */
    public const STATIC_HERO_SUBTITLES = [
        'Import, edit, preview, and publish static or PHP sites.',
        'Use the visual editor, code editor, and optional AI assistant together.',
        'Manage hosted files, domains, previews, and revisions from one workspace.',
        'Edit existing code live and publish when it is ready.',
    ];

    /**
     * Load translations from the internal_ai.json file for a locale.
     */
    protected static function loadInternalAiTranslations(?string $locale = null): ?array
    {
        $locale = $locale ?? app()->getLocale();
        $path = lang_path("{$locale}/internal_ai.json");

        if (file_exists($path)) {
            $content = file_get_contents($path);
            $translations = json_decode($content, true);

            if (json_last_error() === JSON_ERROR_NONE) {
                return $translations;
            }
        }

        return null;
    }

    /**
     * Get translated static suggestions based on locale.
     */
    public static function getStaticSuggestions(?string $locale = null): array
    {
        $translations = self::loadInternalAiTranslations($locale);

        if ($translations && isset($translations['suggestions']) && is_array($translations['suggestions'])) {
            return array_values($translations['suggestions']);
        }

        return self::STATIC_SUGGESTIONS;
    }

    /**
     * Get translated static typing prompts based on locale.
     */
    public static function getStaticTypingPrompts(?string $locale = null): array
    {
        $translations = self::loadInternalAiTranslations($locale);

        if ($translations && isset($translations['typing_prompts']) && is_array($translations['typing_prompts'])) {
            return array_values($translations['typing_prompts']);
        }

        return self::STATIC_TYPING_PROMPTS;
    }

    /**
     * Get translated static greetings based on locale.
     */
    public static function getStaticGreetings(?string $locale = null): array
    {
        $translations = self::loadInternalAiTranslations($locale);

        if ($translations && isset($translations['greetings']) && is_array($translations['greetings'])) {
            return array_values($translations['greetings']);
        }

        return self::STATIC_GREETINGS;
    }

    /**
     * Get translated static hero headlines based on locale.
     */
    public static function getStaticHeroHeadlines(?string $locale = null): array
    {
        $translations = self::loadInternalAiTranslations($locale);

        if ($translations && isset($translations['hero_headlines']) && is_array($translations['hero_headlines'])) {
            return array_values($translations['hero_headlines']);
        }

        return self::STATIC_HERO_HEADLINES;
    }

    /**
     * Get translated static hero subtitles based on locale.
     */
    public static function getStaticHeroSubtitles(?string $locale = null): array
    {
        $translations = self::loadInternalAiTranslations($locale);

        if ($translations && isset($translations['hero_subtitles']) && is_array($translations['hero_subtitles'])) {
            return array_values($translations['hero_subtitles']);
        }

        return self::STATIC_HERO_SUBTITLES;
    }

    /**
     * Check if internal AI is configured.
     */
    public function isConfigured(): bool
    {
        return $this->getProvider() !== null;
    }

    /**
     * Get the configured AI provider.
     */
    public function getProvider(): ?AiProvider
    {
        $providerId = SystemSetting::get('internal_ai_provider_id');

        if (! $providerId) {
            return null;
        }

        $provider = AiProvider::find($providerId);

        if (! $provider || $provider->status !== 'active') {
            return null;
        }

        return $provider;
    }

    /**
     * Get the configured model.
     */
    public function getModel(): string
    {
        $customModel = SystemSetting::get('internal_ai_model');

        if (! empty($customModel)) {
            return $customModel;
        }

        $provider = $this->getProvider();

        if (! $provider) {
            return self::DEFAULT_MODELS[AiProvider::TYPE_OPENAI];
        }

        return self::DEFAULT_MODELS[$provider->type] ?? $provider->getDefaultModel();
    }

    /**
     * Get suggestions with caching.
     * Uses language-based cache keys to support multi-lingual content.
     */
    public function getSuggestions(int $count = 4, ?string $locale = null): array
    {
        $locale = $locale ?? app()->getLocale();

        if (! $this->isConfigured()) {
            return self::getStaticSuggestions($locale);
        }

        $cacheKey = $this->getSuggestionsCacheKey($locale);
        $cached = Cache::get($cacheKey);

        if ($cached !== null) {
            return $cached;
        }

        try {
            $suggestions = $this->generateSuggestions($count, $locale);

            if (count($suggestions) >= $count) {
                Cache::put($cacheKey, $suggestions, self::CACHE_TTL);

                return $suggestions;
            }
        } catch (\Exception $e) {
            Log::warning('Internal AI suggestions failed', [
                'error' => $e->getMessage(),
                'locale' => $locale,
            ]);
        }

        return self::getStaticSuggestions($locale);
    }

    /**
     * Generate suggestions from the AI provider.
     */
    protected function generateSuggestions(int $count, ?string $locale = null): array
    {
        $provider = $this->getProvider();
        if (! $provider) {
            return [];
        }

        $model = $this->getModel();

        $prompt = $this->buildSuggestionsPrompt($count, $locale);

        $response = $this->callProvider($provider, $model, $prompt);

        if (! $response) {
            return [];
        }

        return $this->parseSuggestions($response, $count);
    }

    /**
     * Build the prompt for generating suggestions.
     */
    protected function buildSuggestionsPrompt(int $count, ?string $locale = null): string
    {
        $languageInstruction = $this->getLanguageInstruction($locale);

        return <<<PROMPT
Generate exactly {$count} short, practical web hosting or website editing project ideas.

Users may import files, edit existing code, preview changes, publish to hosting, and optionally ask an AI assistant for code edits.

Each idea should be:
- Concise (5-8 words max)
- Start with action verb (Host, Import, Edit, Publish, Update)
- Varied (sites, landing pages, portfolios, PHP pages, frontend apps, etc.)
- Realistic projects that can be hosted or edited in a website workspace
{$languageInstruction}

Return ONLY a JSON array of strings, nothing else. Example:
["Host a portfolio website", "Import a landing page", "Edit a product site", "Publish a PHP contact page"]
PROMPT;
    }

    /**
     * Get language instruction for AI prompts based on locale.
     */
    protected function getLanguageInstruction(?string $locale): string
    {
        if (! $locale || $locale === 'en') {
            return '- Written in English';
        }

        $languageNames = [
            'ar' => 'Arabic',
            'es' => 'Spanish',
            'fr' => 'French',
            'de' => 'German',
            'zh' => 'Chinese',
            'ja' => 'Japanese',
            'ko' => 'Korean',
            'pt' => 'Portuguese',
            'ru' => 'Russian',
            'it' => 'Italian',
            'nl' => 'Dutch',
            'tr' => 'Turkish',
            'hi' => 'Hindi',
        ];

        $languageName = $languageNames[$locale] ?? ucfirst($locale);

        return "- IMPORTANT: Written in {$languageName} language (not English)";
    }

    /**
     * Generate an HTML section block from a natural-language prompt.
     */
    public function generateHtmlBlock(string $prompt, string $locale = 'en'): ?string
    {
        $provider = $this->getProvider();
        if (! $provider) {
            return null;
        }

        $model = $this->getModel();
        $langInstruction = $this->getLanguageInstruction($locale);

        $fullPrompt = <<<PROMPT
Generate a complete HTML section for a landing page based on the following request:

{$prompt}

Rules:
- Return ONLY the HTML code, no explanation, no markdown fences
- Use a <style> block or inline styles for all CSS — no external stylesheets
- The section must be fully responsive and look professional
- Do NOT include <html>, <head>, or <body> tags — only the section content
- Start directly with the outermost HTML element
{$langInstruction}
PROMPT;

        return $this->callProvider($provider, $model, $fullPrompt, 4000, 60);
    }

    /**
     * Call the appropriate AI provider API.
     */
    protected function callProvider(AiProvider $provider, string $model, string $prompt, int $maxTokens = 300, int $timeout = 15): ?string
    {
        return match ($provider->type) {
            AiProvider::TYPE_OPENAI,
            AiProvider::TYPE_GROK,
            AiProvider::TYPE_DEEPSEEK,
            AiProvider::TYPE_GEMINI,
            AiProvider::TYPE_NVIDIA => $this->callOpenAiCompatible($provider, $model, $prompt, $maxTokens, $timeout),

            AiProvider::TYPE_ANTHROPIC,
            AiProvider::TYPE_ZHIPU => $this->callAnthropic($provider, $model, $prompt, $maxTokens, $timeout),

            default => null,
        };
    }

    /**
     * Call OpenAI-compatible API (OpenAI, Grok, DeepSeek).
     */
    protected function callOpenAiCompatible(AiProvider $provider, string $model, string $prompt, int $maxTokens = 300, int $timeout = 15): ?string
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$provider->getApiKey(),
            'Content-Type' => 'application/json',
        ])->timeout($timeout)->post($provider->getBaseUrl().'/chat/completions', [
            'model' => $model,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'max_tokens' => $maxTokens,
            'temperature' => 0.8,
        ]);

        if (! $response->successful()) {
            Log::warning('OpenAI-compatible internal AI call failed', [
                'provider' => $provider->type,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        }

        return $response->json('choices.0.message.content');
    }

    /**
     * Call Anthropic-compatible API (Anthropic, ZhipuAI).
     */
    protected function callAnthropic(AiProvider $provider, string $model, string $prompt, int $maxTokens = 300, int $timeout = 15): ?string
    {
        // Build base URL - both Anthropic and ZhipuAI need /v1 before /messages
        $baseUrl = $provider->getBaseUrl();
        if (! str_ends_with($baseUrl, '/v1')) {
            $baseUrl .= '/v1';
        }

        $response = Http::withHeaders([
            'x-api-key' => $provider->getApiKey(),
            'anthropic-version' => '2023-06-01',
            'Content-Type' => 'application/json',
        ])->timeout($timeout)->post($baseUrl.'/messages', [
            'model' => $model,
            'max_tokens' => $maxTokens,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
        ]);

        if (! $response->successful()) {
            Log::warning('Anthropic-compatible internal AI call failed', [
                'provider' => $provider->type,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        }

        return $response->json('content.0.text');
    }

    /**
     * Parse suggestions from AI response.
     */
    protected function parseSuggestions(string $content, int $count): array
    {
        // Try to extract JSON array from the content
        $content = trim($content);

        // Handle cases where the response might have markdown code blocks
        if (preg_match('/```(?:json)?\s*([\s\S]*?)```/', $content, $matches)) {
            $content = trim($matches[1]);
        }

        // Try to find JSON array in the content
        if (preg_match('/\[[\s\S]*\]/', $content, $matches)) {
            $content = $matches[0];
        }

        $suggestions = json_decode($content, true);

        if (! is_array($suggestions)) {
            return [];
        }

        // Filter to only strings and limit to count
        $suggestions = array_filter($suggestions, fn ($s) => is_string($s) && strlen($s) > 0);
        $suggestions = array_values($suggestions);

        return array_slice($suggestions, 0, $count);
    }

    /**
     * Get the cache key for suggestions.
     */
    public function getSuggestionsCacheKey(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        return "internal_ai:suggestions:{$locale}";
    }

    /**
     * Clear the suggestions cache.
     */
    public static function clearCache(): void
    {
        Cache::forget('internal_ai:suggestions');
    }

    /**
     * Generate contextual chat suggestions based on conversation history.
     *
     * @param  array  $conversationHistory  Array of messages with 'role' and 'content'
     * @param  int  $count  Number of suggestions to generate
     * @return array|null Returns null if AI is not configured or fails
     */
    public function getChatSuggestions(array $conversationHistory, int $count = 3): ?array
    {
        if (! $this->isConfigured()) {
            return null;
        }

        try {
            return $this->generateChatSuggestions($conversationHistory, $count);
        } catch (\Exception $e) {
            Log::warning('Internal AI chat suggestions failed', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Generate chat suggestions from the AI provider.
     */
    protected function generateChatSuggestions(array $conversationHistory, int $count): ?array
    {
        $provider = $this->getProvider();
        $model = $this->getModel();

        $prompt = $this->buildChatSuggestionsPrompt($conversationHistory, $count);

        $response = $this->callProvider($provider, $model, $prompt);

        if (! $response) {
            return null;
        }

        $suggestions = $this->parseSuggestions($response, $count);

        return count($suggestions) > 0 ? $suggestions : null;
    }

    /**
     * Build the prompt for generating chat suggestions.
     */
    protected function buildChatSuggestionsPrompt(array $conversationHistory, int $count): string
    {
        // Get the last few messages for context (limit to avoid token issues)
        $recentHistory = array_slice($conversationHistory, -6);

        $historyText = '';
        foreach ($recentHistory as $message) {
            $role = $message['role'] ?? 'user';
            $content = $message['content'] ?? '';
            if ($role === 'user' || $role === 'assistant') {
                $historyText .= ucfirst($role).": {$content}\n";
            }
        }

        if (empty($historyText)) {
            $historyText = 'No conversation yet.';
        }

        return <<<PROMPT
Based on this website building conversation, suggest {$count} short follow-up actions the user might want to do next.

Recent conversation:
{$historyText}

Generate exactly {$count} short suggestions (3-6 words each) that are:
- Actionable improvements or additions to the website
- Contextually relevant to what was just built/discussed
- Varied (styling, features, content, etc.)

Return ONLY a JSON array of strings, nothing else. Example:
["Add dark mode toggle", "Create contact form", "Add smooth animations"]
PROMPT;
    }

    /**
     * Get typing prompts with caching.
     * Uses language-based cache keys to support multi-lingual content.
     */
    public function getTypingPrompts(int $count = 8, ?string $locale = null): array
    {
        $locale = $locale ?? app()->getLocale();

        if (! $this->isConfigured()) {
            return self::getStaticTypingPrompts($locale);
        }

        $cacheKey = $this->getTypingPromptsCacheKey($locale);
        $cached = Cache::get($cacheKey);

        if ($cached !== null) {
            return $cached;
        }

        try {
            $prompts = $this->generateTypingPrompts($count, $locale);

            if (count($prompts) >= $count) {
                Cache::put($cacheKey, $prompts, self::CACHE_TTL);

                return $prompts;
            }
        } catch (\Exception $e) {
            Log::warning('Internal AI typing prompts failed', [
                'error' => $e->getMessage(),
                'locale' => $locale,
            ]);
        }

        return self::getStaticTypingPrompts($locale);
    }

    /**
     * Generate typing prompts from the AI provider.
     */
    protected function generateTypingPrompts(int $count, ?string $locale = null): array
    {
        $provider = $this->getProvider();
        if (! $provider) {
            return [];
        }

        $model = $this->getModel();

        $prompt = $this->buildTypingPromptsPrompt($count, $locale);

        $response = $this->callProvider($provider, $model, $prompt);

        if (! $response) {
            return [];
        }

        return $this->parseSuggestions($response, $count);
    }

    /**
     * Build the prompt for generating typing prompts.
     */
    protected function buildTypingPromptsPrompt(int $count, ?string $locale = null): string
    {
        $languageInstruction = $this->getLanguageInstruction($locale);

        return <<<PROMPT
Generate exactly {$count} creative prompts that a user might type into a website hosting workspace.

The product supports code import, live preview, visual edits, code edits, publishing, and an optional AI assistant for existing code.

Each prompt should:
- Be a natural user request (8-12 words)
- End with "..." to indicate it's a typing animation
- Sound like someone managing, editing, or publishing a website
- Be diverse (apps, landing pages, portfolios, dashboards, etc.)
{$languageInstruction}

Return ONLY a JSON array of strings, nothing else. Example:
["Build me a modern portfolio website with dark mode...", "Create a dashboard for tracking my fitness goals...", "I need a landing page for my startup..."]
PROMPT;
    }

    /**
     * Get the cache key for typing prompts.
     */
    public function getTypingPromptsCacheKey(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        return "internal_ai:typing_prompts:{$locale}";
    }

    /**
     * Get a greeting message with caching.
     * Uses language-based cache keys to support multi-lingual content.
     */
    public function getGreeting(int $count = 4, ?string $locale = null): array
    {
        $locale = $locale ?? app()->getLocale();

        if (! $this->isConfigured()) {
            return self::getStaticGreetings($locale);
        }

        $cacheKey = $this->getGreetingsCacheKey($locale);
        $cached = Cache::get($cacheKey);

        if ($cached !== null) {
            return $cached;
        }

        try {
            $greetings = $this->generateGreetings($count, $locale);

            if (count($greetings) >= $count) {
                Cache::put($cacheKey, $greetings, self::CACHE_TTL);

                return $greetings;
            }
        } catch (\Exception $e) {
            Log::warning('Internal AI greetings failed', [
                'error' => $e->getMessage(),
                'locale' => $locale,
            ]);
        }

        return self::getStaticGreetings($locale);
    }

    /**
     * Generate greetings from the AI provider.
     */
    protected function generateGreetings(int $count, ?string $locale = null): array
    {
        $provider = $this->getProvider();
        if (! $provider) {
            return [];
        }

        $model = $this->getModel();

        $prompt = $this->buildGreetingsPrompt($count, $locale);

        $response = $this->callProvider($provider, $model, $prompt);

        if (! $response) {
            return [];
        }

        return $this->parseSuggestions($response, $count);
    }

    /**
     * Build the prompt for generating greetings.
     */
    protected function buildGreetingsPrompt(int $count, ?string $locale = null): string
    {
        $languageInstruction = $this->getLanguageInstruction($locale);

        // For non-English locales, provide the format instruction in a language-agnostic way
        $formatExample = $locale && $locale !== 'en'
            ? '- Format: [Question about hosting/editing/publishing], {name}?'
            : '- Format: "What [site/action] [you/we] [host/edit/publish], {name}?" (e.g., "What site do you want to host, {name}?")';

        return <<<PROMPT
Generate exactly {$count} simple greeting questions for a website hosting and editing workspace.

Users can import files, edit code, preview, publish, and optionally use an AI assistant.

Rules:
- MUST use {name} placeholder at the END before the question mark
- MUST be a simple question about what to host/edit/publish/manage
- NO greetings like "Hello" or "Hi"
- NO time references (morning/evening)
- Under 45 characters
{$formatExample}
{$languageInstruction}

Return ONLY a JSON array of strings.
PROMPT;
    }

    /**
     * Get the cache key for greetings.
     */
    public function getGreetingsCacheKey(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        return "internal_ai:greetings:{$locale}";
    }

    /**
     * Get hero headlines with caching.
     * Uses language-based cache keys to support multi-lingual content.
     */
    public function getHeroHeadlines(int $count = 4, ?string $locale = null): array
    {
        $locale = $locale ?? app()->getLocale();

        if (! $this->isConfigured()) {
            return self::getStaticHeroHeadlines($locale);
        }

        $cacheKey = $this->getHeroHeadlinesCacheKey($locale);
        $cached = Cache::get($cacheKey);

        if ($cached !== null) {
            return $cached;
        }

        try {
            $headlines = $this->generateHeroHeadlines($count, $locale);

            if (count($headlines) >= $count) {
                Cache::put($cacheKey, $headlines, self::CACHE_TTL);

                return $headlines;
            }
        } catch (\Exception $e) {
            Log::warning('Internal AI hero headlines failed', [
                'error' => $e->getMessage(),
                'locale' => $locale,
            ]);
        }

        return self::getStaticHeroHeadlines($locale);
    }

    /**
     * Generate hero headlines from the AI provider.
     */
    protected function generateHeroHeadlines(int $count, ?string $locale = null): array
    {
        $provider = $this->getProvider();
        if (! $provider) {
            return [];
        }

        $model = $this->getModel();

        $prompt = $this->buildHeroHeadlinesPrompt($count, $locale);

        $response = $this->callProvider($provider, $model, $prompt);

        if (! $response) {
            return [];
        }

        return $this->parseSuggestions($response, $count);
    }

    /**
     * Build the prompt for generating hero headlines.
     */
    protected function buildHeroHeadlinesPrompt(int $count, ?string $locale = null): string
    {
        $languageInstruction = $this->getLanguageInstruction($locale);

        return <<<PROMPT
Generate exactly {$count} compelling hero headlines for a website hosting and live editing platform.

The product lets users import code, edit visually or in code, preview, publish, and optionally use an AI assistant.

Each headline should:
- Be short and punchy (4-7 words max)
- Focus on hosting, editing, previewing, or publishing websites
- No punctuation at end (except ? if it's a question)
- Be varied (mix of questions and statements)
{$languageInstruction}

Return ONLY a JSON array of strings, nothing else. Example:
["Host it today", "What site will you publish?", "Edit your website live", "Bring your site online"]
PROMPT;
    }

    /**
     * Get the cache key for hero headlines.
     */
    public function getHeroHeadlinesCacheKey(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        return "internal_ai:hero_headlines:{$locale}";
    }

    /**
     * Get hero subtitles with caching.
     * Uses language-based cache keys to support multi-lingual content.
     */
    public function getHeroSubtitles(int $count = 4, ?string $locale = null): array
    {
        $locale = $locale ?? app()->getLocale();

        if (! $this->isConfigured()) {
            return self::getStaticHeroSubtitles($locale);
        }

        $cacheKey = $this->getHeroSubtitlesCacheKey($locale);
        $cached = Cache::get($cacheKey);

        if ($cached !== null) {
            return $cached;
        }

        try {
            $subtitles = $this->generateHeroSubtitles($count, $locale);

            if (count($subtitles) >= $count) {
                Cache::put($cacheKey, $subtitles, self::CACHE_TTL);

                return $subtitles;
            }
        } catch (\Exception $e) {
            Log::warning('Internal AI hero subtitles failed', [
                'error' => $e->getMessage(),
                'locale' => $locale,
            ]);
        }

        return self::getStaticHeroSubtitles($locale);
    }

    /**
     * Generate hero subtitles from the AI provider.
     */
    protected function generateHeroSubtitles(int $count, ?string $locale = null): array
    {
        $provider = $this->getProvider();
        if (! $provider) {
            return [];
        }

        $model = $this->getModel();

        $prompt = $this->buildHeroSubtitlesPrompt($count, $locale);

        $response = $this->callProvider($provider, $model, $prompt);

        if (! $response) {
            return [];
        }

        return $this->parseSuggestions($response, $count);
    }

    /**
     * Build the prompt for generating hero subtitles.
     */
    protected function buildHeroSubtitlesPrompt(int $count, ?string $locale = null): string
    {
        $languageInstruction = $this->getLanguageInstruction($locale);

        return <<<PROMPT
Generate exactly {$count} short subtitles for a website hosting and live editing platform landing page.

IMPORTANT - This is a hosting workspace where users:
- Import or create static, PHP, and built frontend sites
- Edit visually or directly in code
- Preview and publish hosted sites
- Optionally use an AI assistant to edit existing code

Each subtitle should:
- Be one single sentence (8-12 words max)
- Focus on the chat/conversation aspect of building
- End with a period
- NO mention of drag-and-drop, visual editors, or templates
- Emphasize: hosting, live editing, publishing, optional assistant
{$languageInstruction}

Return ONLY a JSON array of strings, nothing else. Example:
["Import, edit, and publish from one workspace.", "Use live editing and optional AI assistance."]
PROMPT;
    }

    /**
     * Get the cache key for hero subtitles.
     */
    public function getHeroSubtitlesCacheKey(?string $locale = null): string
    {
        $locale = $locale ?? app()->getLocale();

        return "internal_ai:hero_subtitles:{$locale}";
    }

    /**
     * Clear all internal AI caches for all locales.
     */
    public static function clearAllCache(): void
    {
        // Get all active language codes
        $locales = \App\Models\Language::active()->pluck('code')->toArray();

        // Always include 'en' as fallback
        if (! in_array('en', $locales)) {
            $locales[] = 'en';
        }

        // Clear cache for each locale
        foreach ($locales as $locale) {
            Cache::forget("internal_ai:suggestions:{$locale}");
            Cache::forget("internal_ai:typing_prompts:{$locale}");
            Cache::forget("internal_ai:greetings:{$locale}");
            Cache::forget("internal_ai:hero_headlines:{$locale}");
            Cache::forget("internal_ai:hero_subtitles:{$locale}");
        }

        // Also clear legacy keys (non-locale specific) for backwards compatibility
        Cache::forget('internal_ai:suggestions');
        Cache::forget('internal_ai:typing_prompts');
        Cache::forget('internal_ai:greetings');
        Cache::forget('internal_ai:hero_headlines');
        Cache::forget('internal_ai:hero_subtitles');
    }

    /**
     * Refresh all AI content for a specific locale (for cron/manual triggering).
     * Uses 4-hour TTL, scheduled 3x daily.
     */
    public function refreshAllContent(?string $locale = null): array
    {
        $locale = $locale ?? app()->getLocale();

        return [
            'suggestions' => $this->refreshSuggestions(4, $locale),
            'typing_prompts' => $this->refreshTypingPrompts(8, $locale),
            'greetings' => $this->refreshGreetings(4, $locale),
            'hero_headlines' => $this->refreshHeroHeadlines(4, $locale),
            'hero_subtitles' => $this->refreshHeroSubtitles(4, $locale),
        ];
    }

    /**
     * Refresh all AI content for all active locales.
     */
    public function refreshAllContentForAllLocales(): array
    {
        $locales = \App\Models\Language::active()->pluck('code')->toArray();

        // Always include 'en' as fallback
        if (! in_array('en', $locales)) {
            $locales[] = 'en';
        }

        $results = [];
        foreach ($locales as $locale) {
            $results[$locale] = $this->refreshAllContent($locale);
        }

        return $results;
    }

    protected function refreshSuggestions(int $count = 4, ?string $locale = null): array
    {
        $locale = $locale ?? app()->getLocale();
        $suggestions = $this->generateSuggestions($count, $locale);
        if (count($suggestions) >= $count) {
            Cache::put($this->getSuggestionsCacheKey($locale), $suggestions, self::CACHE_TTL);
        }

        return $suggestions;
    }

    protected function refreshTypingPrompts(int $count = 8, ?string $locale = null): array
    {
        $locale = $locale ?? app()->getLocale();
        $prompts = $this->generateTypingPrompts($count, $locale);
        if (count($prompts) >= $count) {
            Cache::put($this->getTypingPromptsCacheKey($locale), $prompts, self::CACHE_TTL);
        }

        return $prompts;
    }

    protected function refreshGreetings(int $count = 4, ?string $locale = null): array
    {
        $locale = $locale ?? app()->getLocale();
        $greetings = $this->generateGreetings($count, $locale);
        if (count($greetings) >= $count) {
            Cache::put($this->getGreetingsCacheKey($locale), $greetings, self::CACHE_TTL);
        }

        return $greetings;
    }

    protected function refreshHeroHeadlines(int $count = 4, ?string $locale = null): array
    {
        $locale = $locale ?? app()->getLocale();
        $headlines = $this->generateHeroHeadlines($count, $locale);
        if (count($headlines) >= $count) {
            Cache::put($this->getHeroHeadlinesCacheKey($locale), $headlines, self::CACHE_TTL);
        }

        return $headlines;
    }

    protected function refreshHeroSubtitles(int $count = 4, ?string $locale = null): array
    {
        $locale = $locale ?? app()->getLocale();
        $subtitles = $this->generateHeroSubtitles($count, $locale);
        if (count($subtitles) >= $count) {
            Cache::put($this->getHeroSubtitlesCacheKey($locale), $subtitles, self::CACHE_TTL);
        }

        return $subtitles;
    }
}
