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
        'saas' => 'SaaS landing and product marketing template for startups, software products, pricing, waitlists, feature launches, and conversion pages',
        'ecommerce' => 'E-commerce store template for online shops, product catalogs, shopping carts, checkout flows, order management, and inventory',
        'dashboard' => 'Admin dashboard template for analytics, metrics, data visualization, management panels, reports, and operations interfaces',
        'cms' => 'Blog/CMS template for content management, blog posts, articles, publishing workflows, editorial sites, and news sites',
        'portfolio' => 'Portfolio template for showcasing work, projects, galleries, personal brands, resumes, agencies, and freelancers',
        'crm' => 'CRM and sales pipeline template for leads, contacts, deals, opportunities, follow-ups, tasks, notes, and account management',
        'booking' => 'Booking and appointments template for services, schedules, reservations, calendars, time slots, consultations, and availability',
        'learning' => 'Learning platform template for courses, lessons, modules, quizzes, student progress, onboarding, and training portals',
        'real_estate' => 'Real estate listings template for properties, rentals, filters, galleries, agents, property details, and inquiries',
        'restaurant' => 'Restaurant and food ordering template for menus, reservations, delivery, pickup, carts, specials, and catering',
        'default' => 'General purpose template for apps or websites that do not clearly fit another category',
    ];

    /**
     * Keyword mappings for fallback classification.
     */
    protected const KEYWORD_MAPPINGS = [
        // Order matters: more specific categories first, then generic ones
        'restaurant' => ['restaurant', 'food', 'menu', 'delivery', 'pickup', 'reservation', 'catering', 'cafe', 'coffee', 'bar', 'restaurante', 'comida', 'menu', 'menú', 'delivery', 'reserva', 'cafeteria', 'cafetería'],
        'real_estate' => ['real estate', 'property', 'properties', 'listing', 'listings', 'rental', 'rentals', 'apartment', 'house', 'agent', 'broker', 'inmobiliaria', 'propiedad', 'propiedades', 'alquiler', 'departamento', 'casa'],
        'learning' => ['course', 'courses', 'lesson', 'lessons', 'learning', 'academy', 'school', 'student', 'quiz', 'training', 'onboarding', 'curso', 'cursos', 'clase', 'clases', 'academia', 'escuela', 'estudiante', 'capacitacion', 'capacitación'],
        'booking' => ['booking', 'appointment', 'appointments', 'calendar', 'schedule', 'reservation', 'availability', 'consultation', 'clinic', 'salon', 'reserva', 'reservas', 'cita', 'citas', 'turno', 'turnos', 'agenda', 'calendario', 'disponibilidad'],
        'crm' => ['crm', 'pipeline', 'lead', 'leads', 'contact', 'contacts', 'deal', 'deals', 'opportunity', 'opportunities', 'sales', 'customer relationship', 'cliente', 'clientes', 'ventas', 'contactos', 'oportunidad', 'oportunidades'],
        'ecommerce' => ['shop', 'store', 'cart', 'checkout', 'buy', 'sell', 'payment', 'order', 'inventory', 'e-commerce', 'ecommerce', 'tienda', 'carrito', 'comprar', 'vender', 'pago', 'pedido', 'inventario'],
        'dashboard' => ['dashboard', 'admin', 'analytics', 'metrics', 'stats', 'reports', 'monitoring', 'panel', 'kpi', 'analytics', 'tablero', 'administrador', 'metricas', 'métricas', 'reportes', 'monitoreo'],
        'cms' => ['blog', 'posts', 'articles', 'content', 'publish', 'editor', 'news', 'magazine', 'cms', 'articulos', 'artículos', 'contenido', 'publicar', 'editorial', 'noticias', 'revista'],
        'portfolio' => ['portfolio', 'showcase', 'gallery', 'resume', 'cv', 'personal', 'freelancer', 'agency', 'portafolio', 'portafolios', 'galeria', 'galería', 'curriculum', 'currículum', 'agencia'],
        'saas' => ['saas', 'software', 'startup', 'landing', 'marketing', 'launch', 'waitlist', 'pricing', 'features', 'product page', 'promotional', 'lanzamiento', 'precios', 'producto', 'suscripcion', 'suscripción'],
    ];

    /**
     * Human-readable labels for template categories.
     */
    protected const CATEGORY_LABELS = [
        'saas' => 'SaaS',
        'ecommerce' => 'E-commerce',
        'dashboard' => 'Dashboard',
        'cms' => 'CMS',
        'portfolio' => 'Portfolio',
        'crm' => 'CRM',
        'booking' => 'Booking',
        'learning' => 'Learning',
        'real_estate' => 'Real estate',
        'restaurant' => 'Restaurant',
        'default' => 'Default',
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

Respond with ONLY one template category name from this exact list: saas, ecommerce, dashboard, cms, portfolio, crm, booking, learning, real_estate, restaurant, default. No explanation, no punctuation, just the single category.
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
     * Get a human-readable label for a template category.
     */
    public function getCategoryLabel(string $category): string
    {
        return self::CATEGORY_LABELS[$category] ?? self::CATEGORY_LABELS['default'];
    }

    /**
     * Suggest the best theme preset for a classified template category.
     */
    public function suggestThemePreset(string $category): ?string
    {
        return match ($category) {
            'saas' => 'midnight',
            'ecommerce' => 'coral',
            'dashboard' => 'slate',
            'cms' => 'neutral',
            'portfolio' => 'forest',
            'crm' => 'blue',
            'booking' => 'ocean',
            'learning' => 'violet',
            'real_estate' => 'mocha',
            'restaurant' => 'summer',
            default => null,
        };
    }

    /**
     * Recommend templates for a project goal, sorted by category fit.
     *
     * @return array{category: string, category_label: string, theme_preset: ?string, templates: array<int, array<string, mixed>>}
     */
    public function recommendTemplates(string $goal, ?Plan $plan = null, int $limit = 6): array
    {
        $category = $this->classify($goal) ?? 'default';
        $templates = Template::forPlan($plan)->get();

        $ranked = $templates
            ->sortByDesc(fn (Template $template) => $this->scoreTemplateForGoal($template, $goal, $category))
            ->values()
            ->take($limit)
            ->map(fn (Template $template) => [
                'id' => $template->id,
                'slug' => $template->slug,
                'name' => $template->name,
                'description' => $template->description,
                'thumbnail' => $template->thumbnail,
                'category' => $template->category,
                'is_system' => $template->is_system,
                'keywords' => $template->keywords ?? [],
                'metadata' => $template->metadata ?? null,
            ])
            ->all();

        return [
            'category' => $category,
            'category_label' => $this->getCategoryLabel($category),
            'theme_preset' => $this->suggestThemePreset($category),
            'templates' => $ranked,
        ];
    }

    /**
     * Score a template against a goal and category.
     */
    protected function scoreTemplateForGoal(Template $template, string $goal, string $category): int
    {
        $score = 0;
        $goalLower = strtolower($goal);

        if ($template->slug === 'default') {
            $score += $category === 'default' ? 40 : 5;
        }

        if (($template->category ?? null) === $category) {
            $score += 120;
        }

        if (str_contains(strtolower($template->slug), str_replace('_', '-', $category))) {
            $score += 50;
        }

        foreach (($template->keywords ?? []) as $keyword) {
            $keywordLower = strtolower((string) $keyword);
            if ($keywordLower !== '' && str_contains($goalLower, $keywordLower)) {
                $score += 20;
            }
        }

        if (str_contains($goalLower, strtolower($template->name))) {
            $score += 15;
        }

        return $score;
    }

    /**
     * Get template by category, filtered by plan.
     */
    public function getTemplateByCategory(string $category, ?Plan $plan = null): ?Template
    {
        if ($category === 'default') {
            return Template::forPlan($plan)
                ->where('slug', 'default')
                ->first();
        }

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
            AiProvider::TYPE_DEEPSEEK,
            AiProvider::TYPE_GEMINI,
            AiProvider::TYPE_NVIDIA => $this->callOpenAiCompatible($provider, $model, $prompt),

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
