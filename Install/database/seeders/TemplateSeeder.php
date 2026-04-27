<?php

namespace Database\Seeders;

use App\Models\Template;
use Illuminate\Database\Seeder;

class TemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Default template - is_system=true means it cannot be deleted
        Template::updateOrCreate(
            ['slug' => 'default'],
            [
                'name' => 'Default',
                'description' => 'Default React/TypeScript template with Vite, Tailwind CSS, and shadcn/ui components.',
                'category' => 'system',
                'keywords' => ['general', 'website', 'web app'],
                'zip_path' => 'templates/default-template.zip',
                'version' => '1.0.0',
                'is_system' => true,
                'metadata' => [
                    'framework' => 'React 18.3.1',
                    'language' => 'TypeScript',
                    'build_tool' => 'Vite 6.0.1',
                    'styling' => 'Tailwind CSS 4.0',
                    'components' => 'shadcn/ui',
                ],
            ]
        );

        // Additional templates - only seed in local environment
        if (app()->environment('local')) {
            $this->seedAdditionalTemplates();
        }
    }

    /**
     * Seed additional templates for local development.
     * is_system = true means template cannot be deleted
     */
    private function seedAdditionalTemplates(): void
    {
        $templates = [
            [
                'slug' => 'ecommerce',
                'name' => 'E-commerce Store',
                'description' => 'Complete e-commerce template with products, cart, checkout, and user accounts',
                'category' => 'ecommerce',
                'keywords' => ['shop', 'store', 'product', 'cart', 'checkout', 'buy', 'sell', 'payment'],
                'zip_path' => 'templates/ecommerce-template.zip',
                'is_system' => false,
            ],
            [
                'slug' => 'dashboard',
                'name' => 'Admin Dashboard',
                'description' => 'Admin dashboard template with analytics, metrics, and management features',
                'category' => 'dashboard',
                'keywords' => ['dashboard', 'admin', 'analytics', 'metrics', 'stats', 'reports'],
                'zip_path' => 'templates/dashboard-template.zip',
                'is_system' => false,
            ],
            [
                'slug' => 'cms',
                'name' => 'Blog/CMS',
                'description' => 'Content management template for blogs, articles, and publishing',
                'category' => 'cms',
                'keywords' => ['blog', 'posts', 'articles', 'content', 'publish', 'news'],
                'zip_path' => 'templates/cms-template.zip',
                'is_system' => false,
            ],
            [
                'slug' => 'landing',
                'name' => 'Landing Page',
                'description' => 'Marketing landing page template with hero, features, pricing, and CTA sections',
                'category' => 'landing',
                'keywords' => ['landing', 'marketing', 'startup', 'saas', 'agency', 'promotional'],
                'zip_path' => 'templates/landing-template.zip',
                'is_system' => false,
            ],
            [
                'slug' => 'portfolio',
                'name' => 'Portfolio',
                'description' => 'Portfolio template for showcasing projects, work, and personal sites',
                'category' => 'portfolio',
                'keywords' => ['portfolio', 'showcase', 'gallery', 'projects', 'resume', 'personal'],
                'zip_path' => 'templates/portfolio-template.zip',
                'is_system' => false,
            ],
        ];

        foreach ($templates as $data) {
            Template::updateOrCreate(
                ['slug' => $data['slug']],
                $data
            );
        }
    }
}
