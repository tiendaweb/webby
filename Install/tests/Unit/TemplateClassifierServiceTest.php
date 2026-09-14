<?php

namespace Tests\Unit;

use App\Models\Template;
use App\Models\Plan;
use App\Services\TemplateClassifierService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TemplateClassifierServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_keyword_fallback_classifies_supported_template_categories(): void
    {
        $service = app(TemplateClassifierService::class);

        $cases = [
            'Launch a SaaS pricing page for my startup' => 'saas',
            'Create an online store with cart and checkout' => 'ecommerce',
            'Build an admin dashboard with metrics and reports' => 'dashboard',
            'I need a blog CMS for articles and news' => 'cms',
            'Make a portfolio for my freelance projects' => 'portfolio',
            'Build a CRM pipeline for leads and deals' => 'crm',
            'Create a booking calendar for appointments' => 'booking',
            'Make a learning platform with courses and quizzes' => 'learning',
            'Build real estate property listings for rentals' => 'real_estate',
            'Create a restaurant menu with delivery orders' => 'restaurant',
        ];

        foreach ($cases as $goal => $expectedCategory) {
            $this->assertSame($expectedCategory, $service->keywordFallback($goal));
        }
    }

    public function test_default_category_resolves_base_template_slug(): void
    {
        $service = app(TemplateClassifierService::class);

        $defaultTemplate = Template::factory()->create([
            'slug' => 'default',
            'category' => 'system',
            'is_system' => true,
        ]);

        Template::factory()->create([
            'slug' => 'react-todo',
            'category' => 'default',
            'is_system' => true,
        ]);

        $this->assertSame(
            $defaultTemplate->id,
            $service->getTemplateByCategory('default')?->id
        );
    }

    public function test_recommend_templates_returns_category_and_theme_preset(): void
    {
        $service = app(TemplateClassifierService::class);
        $plan = Plan::factory()->free()->create();

        $saasTemplate = Template::factory()->create([
            'slug' => 'saas',
            'category' => 'saas',
            'is_system' => true,
            'keywords' => ['saas', 'startup', 'pricing'],
        ]);

        $defaultTemplate = Template::factory()->create([
            'slug' => 'default',
            'category' => 'system',
            'is_system' => true,
        ]);

        $result = $service->recommendTemplates('Build a SaaS landing page for my startup', $plan, 3);

        $this->assertSame('saas', $result['category']);
        $this->assertSame('midnight', $result['theme_preset']);
        $this->assertNotEmpty($result['templates']);
        $this->assertSame($saasTemplate->id, $result['templates'][0]['id']);
        $this->assertContains($defaultTemplate->id, array_column($result['templates'], 'id'));
    }
}
