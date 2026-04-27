<?php

namespace App\Services;

use App\Models\AiProvider;
use App\Models\Plan;
use App\Models\SystemSetting;
use App\Models\Template;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TemplateClassifierService
{
    /**
     * Valid template categories.
     */
    protected const VALID_CATEGORIES = [
        'ecommerce' => 'E-commerce store template for online shops, product catalogs, shopping carts, checkout flows, order management',
        'dashboard' => 'Admin dashboard template for analytics, metrics, data visualization, management panels, admin interfaces',
        'cms' => 'Blog/CMS template for content management, blog posts, articles, publishing, news sites',
        'landing' => 'Landing page template for marketing, startup pages, SaaS products, promotional sites, waitlist pages',
        'portfolio' => 'Portfolio template for showcasing work, projects, galleries, personal sites, resumes',
        'default' => 'General purpose template for websites that don\'t fit other categories',
    ];

    /**
     * Keyword mappings for fallback classification.
     */
    protected const KEYWORD_MAPPINGS = [
        // Order matters: more specific categories first, then generic ones
        'landing' => ['landing', 'marketing', 'startup', 'saas', 'agency', 'launch', 'waitlist', 'promotional'],
        'portfolio' => ['portfolio', 'showcase', 'gallery', 'resume', 'cv', 'personal'],
        'cms' => ['blog', 'posts', 'articles', 'content', 'publish', 'editor', 'news', 'magazine', 'cms'],
        'dashboard' => ['dashboard', 'admin', 'analytics', 'metrics', 'stats', 'reports', 'monitoring', 'panel'],
        'ecommerce' => ['shop', 'store', 'cart', 'checkout', 'buy', 'sell', 'payment', 'order', 'inventory', 'e-commerce', 'ecommerce'],
    ];

    /**
     * Classify user goal using AI to determine best template.
     */
    public function classify(string $goal): ?string
    {
        // Try AI classification first
        $aiResult = $this->classifyWithAi($goal);
        if ($aiResult !== null) {
            return $aiResult;
        }

        // Fall back to keyword matching
        return $this->keywordFallback($goal);
    }

    /**
     * Classify using AI provider.
     */
    protected function classifyWithAi(string $goal): ?string
    {
        $provider = $this->getProvider();
        if (! $provider) {
            return null;
        }

        try {
            $prompt = $this->buildClassificationPrompt($goal);
            $model = $this->getModel($provider);

            $response = $this->callProvider($provider, $model, $prompt);

            if ($response !== null) {
                $category = $this->parseResponse($response);
                if ($category !== null) {
                    Log::info('Template classified by AI', [
                        'goal' => substr($goal, 0, 100),
                        'category' => $category,
                    ]);

                    return $category;
                }
            }
        } catch (\Exception $e) {
            Log::warning('AI template classification failed', [
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * Build the classification prompt.
     */
    protected function buildClassificationPrompt(string $goal): string
    {
        $templateList = collect(self::VALID_CATEGORIES)
            ->map(fn ($desc, $key) => "- {$key}: {$desc}")
            ->implode("\n");

        return <<<PROMPT
You are a template classifier. Given a user's project goal, determine which template category best matches their needs.

Available templates:
{$templateList}

User's goal: "{$goal}"

Respond with ONLY the template category name (ecommerce, dashboard, cms, landing, portfolio, or default). No explanation, no punctuation, just the single word.
PROMPT;
    }

    /**
     * Parse AI response to extract category.
     */
    protected function parseResponse(string $response): ?string
    {
        // Clean the response
        $response = trim(strtolower($response));

        // Remove any markdown code blocks
        if (preg_match('/```(?:json)?\s*([\s\S]*?)```/', $response, $matches)) {
            $response = trim($matches[1]);
        }

        // Remove quotes
        $response = trim($response, '"\'');

        // Validate it's a known category
        if (array_key_exists($response, self::VALID_CATEGORIES)) {
            return $response;
        }

        return null;
    }

    /**
     * Fallback keyword matching if AI is unavailable.
     */
    public function keywordFallback(string $goal): ?string
    {
        $goal = strtolower($goal);

        foreach (self::KEYWORD_MAPPINGS as $category => $keywords) {
            foreach ($keywords as $keyword) {
                if (str_contains($goal, $keyword)) {
                    Log::debug('Template classified by keyword fallback', [
                        'goal' => substr($goal, 0, 100),
                        'category' => $category,
                        'matched_keyword' => $keyword,
                    ]);

                    return $category;
                }
            }
        }

        return null;
    }

    /**
     * Get template by category, filtered by plan.
     */
    public function getTemplateByCategory(string $category, ?Plan $plan = null): ?Template
    {
        return Template::forPlan($plan)
            ->where('category', $category)
            ->first();
    }

    /**
     * Get the configured AI provider.
     */
    protected function getProvider(): ?AiProvider
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
     * Get the model to use for classification.
     */
    protected function getModel(AiProvider $provider): string
    {
        $customModel = SystemSetting::get('internal_ai_model');

        if (! empty($customModel)) {
            return $customModel;
        }

        return $provider->getDefaultModel();
    }

    /**
     * Call the appropriate AI provider API.
     */
    protected function callProvider(AiProvider $provider, string $model, string $prompt): ?string
    {
        return match ($provider->type) {
            AiProvider::TYPE_OPENAI,
            AiProvider::TYPE_GROK,
            AiProvider::TYPE_DEEPSEEK => $this->callOpenAiCompatible($provider, $model, $prompt),

            AiProvider::TYPE_ANTHROPIC,
            AiProvider::TYPE_ZHIPU => $this->callAnthropic($provider, $model, $prompt),

            default => null,
        };
    }

    /**
     * Call OpenAI-compatible API (OpenAI, Grok, DeepSeek).
     */
    protected function callOpenAiCompatible(AiProvider $provider, string $model, string $prompt): ?string
    {
        $response = Http::withHeaders([
            'Authorization' => 'Bearer '.$provider->getApiKey(),
            'Content-Type' => 'application/json',
        ])->timeout(10)->post($provider->getBaseUrl().'/chat/completions', [
            'model' => $model,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'max_tokens' => 20,
            'temperature' => 0,
        ]);

        if (! $response->successful()) {
            Log::warning('OpenAI-compatible template classification failed', [
                'provider' => $provider->type,
                'status' => $response->status(),
            ]);

            return null;
        }

        return $response->json('choices.0.message.content');
    }

    /**
     * Call Anthropic-compatible API (Anthropic, ZhipuAI).
     */
    protected function callAnthropic(AiProvider $provider, string $model, string $prompt): ?string
    {
        $baseUrl = $provider->getBaseUrl();
        if (! str_ends_with($baseUrl, '/v1')) {
            $baseUrl .= '/v1';
        }

        $response = Http::withHeaders([
            'x-api-key' => $provider->getApiKey(),
            'anthropic-version' => '2023-06-01',
            'Content-Type' => 'application/json',
        ])->timeout(10)->post($baseUrl.'/messages', [
            'model' => $model,
            'max_tokens' => 20,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
        ]);

        if (! $response->successful()) {
            Log::warning('Anthropic-compatible template classification failed', [
                'provider' => $provider->type,
                'status' => $response->status(),
            ]);

            return null;
        }

        return $response->json('content.0.text');
    }
}
