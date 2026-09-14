<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\Template;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

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

        // Additional bundled templates are available only when their ZIPs ship with
        // the installation. This keeps production from registering missing files.
        $this->seedAdditionalTemplates();
    }

    /**
     * Seed additional templates for local development.
     * is_system = true means template cannot be deleted
     */
    private function seedAdditionalTemplates(): void
    {
        $templates = [
            [
                'slug' => 'php-todo',
                'name' => 'PHP Todo List',
                'description' => 'Aplicación de lista de tareas en PHP puro sin base de datos embebida. Incluye API REST y frontend con Tailwind CSS.',
                'category' => 'default',
                'keywords' => ['todo', 'tareas', 'task', 'list', 'php', 'crud'],
                'zip_path' => 'templates/php-todo-template.zip',
                'is_system' => true,
                'version' => '1.0.0',
                'metadata' => [
                    'language' => 'PHP',
                    'runtime' => 'php',
                    'framework' => 'Vanilla PHP',
                    'database' => 'No embedded database',
                    'type' => 'blank',
                    'styling' => 'Tailwind CSS CDN',
                ],
            ],
            [
                'slug' => 'react-todo',
                'name' => 'React Todo List',
                'description' => 'Aplicación de lista de tareas en React + TypeScript con Vite y Tailwind CSS 4. Persistencia en localStorage.',
                'category' => 'default',
                'keywords' => ['todo', 'tareas', 'task', 'list', 'react', 'typescript', 'crud', 'vite'],
                'zip_path' => 'templates/react-todo-template.zip',
                'is_system' => false,
                'version' => '1.0.0',
                'metadata' => [
                    'framework' => 'React 18',
                    'language' => 'TypeScript',
                    'build_tool' => 'Vite 6',
                    'styling' => 'Tailwind CSS 4',
                    'state' => 'useState + localStorage',
                ],
            ],
            [
                'slug' => 'saas',
                'name' => 'SaaS Landing',
                'description' => 'SaaS/product landing template with hero, feature grid, pricing, testimonials, FAQ, and conversion-focused CTAs.',
                'category' => 'saas',
                'keywords' => ['saas', 'software', 'startup', 'landing', 'pricing', 'waitlist', 'features', 'launch', 'producto', 'precios'],
                'zip_path' => 'templates/saas-template.zip',
                'is_system' => false,
                'version' => '1.0.0',
                'plan_slugs' => ['pro', 'enterprise'],
            ],
            [
                'slug' => 'ecommerce',
                'name' => 'E-commerce Store',
                'description' => 'Complete e-commerce template with product catalog, filtering, cart summary, checkout CTA, and merchandising sections.',
                'category' => 'ecommerce',
                'keywords' => ['shop', 'store', 'product', 'cart', 'checkout', 'buy', 'sell', 'payment', 'tienda', 'carrito'],
                'zip_path' => 'templates/ecommerce-template.zip',
                'is_system' => false,
                'version' => '1.0.0',
                'plan_slugs' => ['pro', 'enterprise'],
            ],
            [
                'slug' => 'dashboard',
                'name' => 'Admin Dashboard',
                'description' => 'Admin dashboard template with KPIs, charts-ready cards, reports, tables, alerts, and operational workflows.',
                'category' => 'dashboard',
                'keywords' => ['dashboard', 'admin', 'analytics', 'metrics', 'stats', 'reports', 'tablero', 'metricas', 'métricas'],
                'zip_path' => 'templates/dashboard-template.zip',
                'is_system' => false,
                'version' => '1.0.0',
                'plan_slugs' => ['pro', 'enterprise'],
            ],
            [
                'slug' => 'cms',
                'name' => 'Blog/CMS',
                'description' => 'Content management template for blogs, articles, editorial workflows, categories, search, and publishing states.',
                'category' => 'cms',
                'keywords' => ['blog', 'posts', 'articles', 'content', 'publish', 'news', 'cms', 'articulos', 'artículos', 'contenido'],
                'zip_path' => 'templates/cms-template.zip',
                'is_system' => false,
                'version' => '1.0.0',
                'plan_slugs' => ['pro', 'enterprise'],
            ],
            [
                'slug' => 'portfolio',
                'name' => 'Portfolio',
                'description' => 'Portfolio template for showcasing projects, work, services, testimonials, resume highlights, and contact CTAs.',
                'category' => 'portfolio',
                'keywords' => ['portfolio', 'showcase', 'gallery', 'projects', 'resume', 'personal', 'portafolio', 'galeria', 'galería'],
                'zip_path' => 'templates/portfolio-template.zip',
                'is_system' => false,
                'version' => '1.0.0',
                'plan_slugs' => ['pro', 'enterprise'],
            ],
            [
                'slug' => 'crm',
                'name' => 'CRM Pipeline',
                'description' => 'CRM template with contacts, leads, pipeline columns, deal tracking, follow-up tasks, and sales metrics.',
                'category' => 'crm',
                'keywords' => ['crm', 'pipeline', 'lead', 'leads', 'contacts', 'deals', 'sales', 'clientes', 'ventas'],
                'zip_path' => 'templates/crm-template.zip',
                'is_system' => false,
                'version' => '1.0.0',
                'plan_slugs' => ['pro', 'enterprise'],
            ],
            [
                'slug' => 'booking',
                'name' => 'Booking Appointments',
                'description' => 'Booking template with services, availability slots, reservation form, appointment overview, and confirmation panel.',
                'category' => 'booking',
                'keywords' => ['booking', 'appointments', 'calendar', 'schedule', 'reservation', 'citas', 'turnos', 'agenda'],
                'zip_path' => 'templates/booking-template.zip',
                'is_system' => false,
                'version' => '1.0.0',
                'plan_slugs' => ['pro', 'enterprise'],
            ],
            [
                'slug' => 'learning',
                'name' => 'Learning Platform',
                'description' => 'Learning platform template with courses, modules, lessons, progress, quizzes, and student dashboard sections.',
                'category' => 'learning',
                'keywords' => ['learning', 'courses', 'lessons', 'academy', 'student', 'quiz', 'cursos', 'clases', 'academia'],
                'zip_path' => 'templates/learning-template.zip',
                'is_system' => false,
                'version' => '1.0.0',
                'plan_slugs' => ['pro', 'enterprise'],
            ],
            [
                'slug' => 'real-estate',
                'name' => 'Real Estate Listings',
                'description' => 'Real estate template with property listings, filters, featured homes, agent CTA, and inquiry-focused detail cards.',
                'category' => 'real_estate',
                'keywords' => ['real estate', 'properties', 'listings', 'rentals', 'agents', 'inmobiliaria', 'propiedades', 'alquiler'],
                'zip_path' => 'templates/real-estate-template.zip',
                'is_system' => false,
                'version' => '1.0.0',
                'plan_slugs' => ['pro', 'enterprise'],
            ],
            [
                'slug' => 'restaurant',
                'name' => 'Restaurant Ordering',
                'description' => 'Restaurant template with menu categories, featured dishes, order summary, reservations, hours, and promotions.',
                'category' => 'restaurant',
                'keywords' => ['restaurant', 'food', 'menu', 'delivery', 'reservation', 'catering', 'restaurante', 'comida', 'reserva'],
                'zip_path' => 'templates/restaurant-template.zip',
                'is_system' => false,
                'version' => '1.0.0',
                'plan_slugs' => ['pro', 'enterprise'],
            ],
        ];

        foreach ($templates as $data) {
            if (! Storage::disk('local')->exists($data['zip_path'])) {
                continue;
            }

            $planSlugs = $data['plan_slugs'] ?? [];
            unset($data['plan_slugs']);

            if (! isset($data['metadata'])) {
                $data['metadata'] = $this->readTemplateMetadata($data['zip_path']);
            }

            Template::updateOrCreate(
                ['slug' => $data['slug']],
                $data
            )->plans()->syncWithoutDetaching(
                Plan::whereIn('slug', $planSlugs)->pluck('id')->all()
            );
        }
    }

    /**
     * Read bundled template metadata from its template.json file.
     */
    private function readTemplateMetadata(string $zipPath): ?array
    {
        $zip = new ZipArchive;
        $fullZipPath = Storage::disk('local')->path($zipPath);

        if ($zip->open($fullZipPath) !== true) {
            return null;
        }

        $jsonContent = $zip->getFromName('template.json');
        $zip->close();

        if (! $jsonContent) {
            return null;
        }

        $decoded = json_decode($jsonContent, true);

        return is_array($decoded) ? $decoded : null;
    }
}
