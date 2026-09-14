<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Only run if landing_pages table exists and AAPP HOST page doesn't already exist
        if (! \Illuminate\Support\Facades\Schema::hasTable('landing_pages')) {
            return;
        }

        if (DB::table('landing_pages')->where('slug', 'aapp-host')->exists()) {
            return;
        }

        // Create the AAPP HOST landing page and mark it as home
        DB::table('landing_pages')->where('is_home', true)->update(['is_home' => false]);

        $pageId = DB::table('landing_pages')->insertGetId([
            'name'             => 'AAPP HOST',
            'slug'             => 'aapp-host',
            'is_home'          => true,
            'is_active'        => true,
            'meta_title'       => 'AAPP HOST — Membresía de Desarrollo, Marketing y Automatización con IA',
            'meta_description' => 'Ejecuta tareas ilimitadas de desarrollo, marketing y automatización con una membresía mensual. Potenciado por Claude, Codex y herramientas IA de última generación.',
            'settings'         => json_encode(['theme' => 'dark', 'animated_bg' => true]),
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);

        // Section definitions for AAPP HOST
        $sections = [
            ['type' => 'hero',             'sort_order' => 0,  'is_enabled' => true],
            ['type' => 'social_proof',     'sort_order' => 1,  'is_enabled' => true],
            ['type' => 'features',         'sort_order' => 2,  'is_enabled' => true, 'settings' => json_encode(['layout' => 'bento'])],
            ['type' => 'use_cases',        'sort_order' => 3,  'is_enabled' => true],
            ['type' => 'product_showcase', 'sort_order' => 4,  'is_enabled' => true],
            ['type' => 'pricing',          'sort_order' => 5,  'is_enabled' => true],
            ['type' => 'testimonials',     'sort_order' => 6,  'is_enabled' => true],
            ['type' => 'trusted_by',       'sort_order' => 7,  'is_enabled' => true],
            ['type' => 'faq',              'sort_order' => 8,  'is_enabled' => true],
            ['type' => 'cta',              'sort_order' => 9,  'is_enabled' => true],
        ];

        $sectionIds = [];
        foreach ($sections as $sectionData) {
            $settings = $sectionData['settings'] ?? null;
            unset($sectionData['settings']);

            $id = DB::table('landing_sections')->insertGetId(array_merge($sectionData, [
                'landing_page_id' => $pageId,
                'settings'        => $settings,
                'created_at'      => now(),
                'updated_at'      => now(),
            ]));

            $sectionIds[$sectionData['type']] = $id;
        }

        // ─── Seed content per section ────────────────────────────────

        $this->seedHero($sectionIds['hero']);
        $this->seedSocialProof($sectionIds['social_proof']);
        $this->seedFeatures($sectionIds['features']);
        $this->seedUseCases($sectionIds['use_cases']);
        $this->seedProductShowcase($sectionIds['product_showcase']);
        $this->seedPricing($sectionIds['pricing']);
        $this->seedTestimonials($sectionIds['testimonials']);
        $this->seedTrustedBy($sectionIds['trusted_by']);
        $this->seedFaq($sectionIds['faq']);
        $this->seedCta($sectionIds['cta']);
    }

    protected function insertContent(int $sectionId, string $locale, string $field, string $value): void
    {
        DB::table('landing_contents')->insert([
            'section_id' => $sectionId,
            'locale'     => $locale,
            'field'      => $field,
            'value'      => $value,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    protected function insertItem(int $sectionId, string $locale, int $sortOrder, array $data): void
    {
        DB::table('landing_items')->insert([
            'section_id' => $sectionId,
            'locale'     => $locale,
            'item_key'   => \Illuminate\Support\Str::uuid()->toString(),
            'sort_order' => $sortOrder,
            'is_enabled' => true,
            'data'       => json_encode($data),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    // ─── Hero ────────────────────────────────────────────────────

    protected function seedHero(int $id): void
    {
        $this->insertContent($id, 'es', 'headlines', json_encode([
            'Tu equipo de desarrollo, marketing y automatización — con IA, a demanda',
            'Una membresía. Tareas ilimitadas. Resultados reales.',
            'Escala tu negocio con IA sin contratar un equipo completo',
        ]));
        $this->insertContent($id, 'es', 'subtitles', json_encode([
            'Solicita tareas, nosotros las ejecutamos con IA y revisión humana. Rápido, escalable y accesible.',
            'Desde desarrollo web hasta automatizaciones n8n: tu cola de tareas, siempre activa.',
        ]));
        $this->insertContent($id, 'es', 'cta_button', 'Comenzar ahora');
        $this->insertContent($id, 'es', 'trusted_by_title', 'Potenciado por herramientas líderes de IA');

        // Trusted-by logos inside hero
        $logos = [
            ['name' => 'Claude', 'initial' => 'C', 'color' => '#d97706'],
            ['name' => 'Codex', 'initial' => 'O', 'color' => '#10b981'],
            ['name' => 'n8n', 'initial' => 'n', 'color' => '#ea580c'],
            ['name' => 'OpenAI', 'initial' => 'O', 'color' => '#6366f1'],
            ['name' => 'Webby', 'initial' => 'W', 'color' => '#3b82f6'],
        ];

        foreach ($logos as $i => $logo) {
            $this->insertItem($id, 'es', $i, $logo);
        }

        // English
        $this->insertContent($id, 'en', 'headlines', json_encode([
            'Your development, marketing & automation team — AI-powered, on demand',
            'One membership. Unlimited tasks. Real results.',
            'Scale your business with AI without hiring a full team',
        ]));
        $this->insertContent($id, 'en', 'subtitles', json_encode([
            'Submit tasks, we execute them with AI and human review. Fast, scalable and affordable.',
        ]));
        $this->insertContent($id, 'en', 'cta_button', 'Get started');
        $this->insertContent($id, 'en', 'trusted_by_title', 'Powered by leading AI tools');
        foreach ($logos as $i => $logo) {
            $this->insertItem($id, 'en', $i, $logo);
        }
    }

    // ─── Social Proof ────────────────────────────────────────────

    protected function seedSocialProof(int $id): void
    {
        $this->insertContent($id, 'es', 'users_label', 'Clientes activos');
        $this->insertContent($id, 'es', 'projects_label', 'Tareas completadas');
        $this->insertContent($id, 'es', 'uptime_label', 'Satisfacción garantizada');
        $this->insertContent($id, 'es', 'uptime_value', '100%');

        $this->insertContent($id, 'en', 'users_label', 'Active clients');
        $this->insertContent($id, 'en', 'projects_label', 'Completed tasks');
        $this->insertContent($id, 'en', 'uptime_label', 'Satisfaction guaranteed');
        $this->insertContent($id, 'en', 'uptime_value', '100%');
    }

    // ─── Features ────────────────────────────────────────────────

    protected function seedFeatures(int $id): void
    {
        $this->insertContent($id, 'es', 'title', 'Todo lo que necesitas para crecer');
        $this->insertContent($id, 'es', 'subtitle', 'Una membresía que cubre desarrollo, marketing, automatización y mucho más');

        $features = [
            ['title' => 'Desarrollo Web & Apps', 'description' => 'Landing pages, apps React/Laravel, APIs, integraciones y más. Entregamos código limpio y funcional.', 'icon' => 'Code2', 'size' => 'large'],
            ['title' => 'Marketing Digital', 'description' => 'Copy, contenido SEO, campañas y estrategia de contenidos impulsada por IA.', 'icon' => 'Megaphone', 'size' => 'medium'],
            ['title' => 'Automatizaciones n8n', 'description' => 'Flujos de trabajo automáticos que conectan tus herramientas y eliminan trabajo manual.', 'icon' => 'Zap', 'size' => 'medium'],
            ['title' => 'Soluciones Empresariales', 'description' => 'CRMs, dashboards, sistemas internos y herramientas personalizadas para tu empresa.', 'icon' => 'Building2', 'size' => 'medium'],
            ['title' => 'Integraciones & APIs', 'description' => 'Conecta cualquier servicio: Stripe, WhatsApp, Google, Shopify, HubSpot y más.', 'icon' => 'Plug', 'size' => 'medium'],
            ['title' => 'IA Generativa Aplicada', 'description' => 'Chatbots, asistentes, análisis de datos y flujos inteligentes con Claude, GPT y más.', 'icon' => 'Bot', 'size' => 'large'],
        ];

        foreach ($features as $i => $feat) {
            $this->insertItem($id, 'es', $i, $feat);
        }

        $this->insertContent($id, 'en', 'title', 'Everything you need to grow');
        $this->insertContent($id, 'en', 'subtitle', 'One membership covering development, marketing, automation and more');

        $featuresEn = [
            ['title' => 'Web & App Development', 'description' => 'Landing pages, React/Laravel apps, APIs and integrations. We deliver clean, functional code.', 'icon' => 'Code2', 'size' => 'large'],
            ['title' => 'Digital Marketing', 'description' => 'AI-powered copy, SEO content, campaigns and content strategy.', 'icon' => 'Megaphone', 'size' => 'medium'],
            ['title' => 'n8n Automations', 'description' => 'Automated workflows that connect your tools and eliminate manual work.', 'icon' => 'Zap', 'size' => 'medium'],
            ['title' => 'Enterprise Solutions', 'description' => 'CRMs, dashboards, internal systems and custom tools for your company.', 'icon' => 'Building2', 'size' => 'medium'],
            ['title' => 'Integrations & APIs', 'description' => 'Connect any service: Stripe, WhatsApp, Google, Shopify, HubSpot and more.', 'icon' => 'Plug', 'size' => 'medium'],
            ['title' => 'Applied Generative AI', 'description' => 'Chatbots, assistants, data analysis and intelligent flows with Claude, GPT and more.', 'icon' => 'Bot', 'size' => 'large'],
        ];

        foreach ($featuresEn as $i => $feat) {
            $this->insertItem($id, 'en', $i, $feat);
        }
    }

    // ─── Use Cases ───────────────────────────────────────────────

    protected function seedUseCases(int $id): void
    {
        $this->insertContent($id, 'es', 'title', '¿Para quién es AAPP HOST?');
        $this->insertContent($id, 'es', 'subtitle', 'Diseñado para emprendedores, startups y empresas que quieren resultados sin los costos de un equipo interno');

        $cases = [
            ['title' => 'Emprendedores', 'description' => 'Valida ideas, lanza MVPs y automatiza procesos desde el día uno sin contratar desarrolladores.', 'icon' => 'Rocket'],
            ['title' => 'Agencias', 'description' => 'Escala tu capacidad de entrega sin aumentar tu plantilla. Subcontrata tareas técnicas y de marketing.', 'icon' => 'Users'],
            ['title' => 'Startups', 'description' => 'Mueve rápido: iteraciones semanales, integraciones rápidas y automatizaciones que ahorran tiempo.', 'icon' => 'Zap'],
            ['title' => 'Empresas', 'description' => 'Digitaliza procesos, integra sistemas y despliega soluciones IA sin largos proyectos de IT.', 'icon' => 'Building2'],
        ];

        foreach ($cases as $i => $c) {
            $this->insertItem($id, 'es', $i, $c);
        }

        $this->insertContent($id, 'en', 'title', 'Who is AAPP HOST for?');
        $this->insertContent($id, 'en', 'subtitle', 'Built for entrepreneurs, startups and companies that want results without the cost of an internal team');

        $casesEn = [
            ['title' => 'Entrepreneurs', 'description' => 'Validate ideas, launch MVPs and automate processes from day one without hiring developers.', 'icon' => 'Rocket'],
            ['title' => 'Agencies', 'description' => 'Scale your delivery capacity without growing your team. Outsource technical and marketing tasks.', 'icon' => 'Users'],
            ['title' => 'Startups', 'description' => 'Move fast: weekly iterations, quick integrations and automations that save time.', 'icon' => 'Zap'],
            ['title' => 'Enterprises', 'description' => 'Digitize processes, integrate systems and deploy AI solutions without long IT projects.', 'icon' => 'Building2'],
        ];

        foreach ($casesEn as $i => $c) {
            $this->insertItem($id, 'en', $i, $c);
        }
    }

    // ─── Product Showcase ────────────────────────────────────────

    protected function seedProductShowcase(int $id): void
    {
        $this->insertContent($id, 'es', 'title', 'Así funciona nuestra membresía');
        $this->insertContent($id, 'es', 'subtitle', 'Un proceso simple, transparente y orientado a resultados');

        $tabs = [
            ['label' => '1. Solicita', 'value' => 'request', 'screenshot_light' => '', 'screenshot_dark' => ''],
            ['label' => '2. Priorizamos', 'value' => 'prioritize', 'screenshot_light' => '', 'screenshot_dark' => ''],
            ['label' => '3. Ejecutamos', 'value' => 'execute', 'screenshot_light' => '', 'screenshot_dark' => ''],
            ['label' => '4. Entregamos', 'value' => 'deliver', 'screenshot_light' => '', 'screenshot_dark' => ''],
        ];

        foreach ($tabs as $i => $tab) {
            $this->insertItem($id, 'es', $i, $tab);
        }

        $this->insertContent($id, 'en', 'title', 'How our membership works');
        $this->insertContent($id, 'en', 'subtitle', 'A simple, transparent and results-oriented process');

        $tabsEn = [
            ['label' => '1. Request', 'value' => 'request', 'screenshot_light' => '', 'screenshot_dark' => ''],
            ['label' => '2. Prioritize', 'value' => 'prioritize', 'screenshot_light' => '', 'screenshot_dark' => ''],
            ['label' => '3. Execute', 'value' => 'execute', 'screenshot_light' => '', 'screenshot_dark' => ''],
            ['label' => '4. Deliver', 'value' => 'deliver', 'screenshot_light' => '', 'screenshot_dark' => ''],
        ];

        foreach ($tabsEn as $i => $tab) {
            $this->insertItem($id, 'en', $i, $tab);
        }
    }

    // ─── Pricing ─────────────────────────────────────────────────

    protected function seedPricing(int $id): void
    {
        $this->insertContent($id, 'es', 'title', 'Planes simples, sin sorpresas');
        $this->insertContent($id, 'es', 'subtitle', 'Elige tu membresía y empieza a ejecutar tareas hoy mismo');
        $this->insertContent($id, 'en', 'title', 'Simple plans, no surprises');
        $this->insertContent($id, 'en', 'subtitle', 'Choose your membership and start executing tasks today');
    }

    // ─── Testimonials ────────────────────────────────────────────

    protected function seedTestimonials(int $id): void
    {
        $this->insertContent($id, 'es', 'title', 'Lo que dicen nuestros clientes');
        $this->insertContent($id, 'es', 'subtitle', 'Resultados reales de equipos reales');

        $testimonials = [
            [
                'quote'   => 'En dos semanas automatizamos todo nuestro proceso de onboarding. Lo que antes tomaba días ahora sucede solo.',
                'author'  => 'María González',
                'role'    => 'CEO, Agencia Digital',
                'rating'  => 5,
                'company_url' => '',
            ],
            [
                'quote'   => 'La membresía nos permitió lanzar nuestro MVP en tiempo récord. El equipo entendió exactamente lo que necesitábamos.',
                'author'  => 'Carlos Mendoza',
                'role'    => 'Fundador, SaaS Startup',
                'rating'  => 5,
                'company_url' => '',
            ],
            [
                'quote'   => 'Increíble relación calidad-precio. Tenemos acceso a desarrollo, marketing y automatizaciones por el precio de un freelancer.',
                'author'  => 'Laura Sánchez',
                'role'    => 'Directora de Operaciones',
                'rating'  => 5,
                'company_url' => '',
            ],
        ];

        foreach ($testimonials as $i => $t) {
            $this->insertItem($id, 'es', $i, $t);
        }

        $this->insertContent($id, 'en', 'title', 'What our clients say');
        $this->insertContent($id, 'en', 'subtitle', 'Real results from real teams');

        $testimonialsEn = [
            [
                'quote'   => 'In two weeks we automated our entire onboarding process. What used to take days now happens automatically.',
                'author'  => 'Maria G.',
                'role'    => 'CEO, Digital Agency',
                'rating'  => 5,
                'company_url' => '',
            ],
            [
                'quote'   => 'The membership let us launch our MVP in record time. The team understood exactly what we needed.',
                'author'  => 'Carlos M.',
                'role'    => 'Founder, SaaS Startup',
                'rating'  => 5,
                'company_url' => '',
            ],
        ];

        foreach ($testimonialsEn as $i => $t) {
            $this->insertItem($id, 'en', $i, $t);
        }
    }

    // ─── Trusted By ──────────────────────────────────────────────

    protected function seedTrustedBy(int $id): void
    {
        $this->insertContent($id, 'es', 'title', 'Stack tecnológico de clase mundial');
        $this->insertContent($id, 'en', 'title', 'World-class technology stack');

        $companies = [
            ['name' => 'Anthropic Claude', 'initial' => 'C', 'color' => '#d97706'],
            ['name' => 'OpenAI Codex',     'initial' => 'O', 'color' => '#10b981'],
            ['name' => 'n8n',              'initial' => 'n', 'color' => '#ea580c'],
            ['name' => 'Laravel',          'initial' => 'L', 'color' => '#ef4444'],
            ['name' => 'React',            'initial' => 'R', 'color' => '#3b82f6'],
            ['name' => 'Stripe',           'initial' => 'S', 'color' => '#8b5cf6'],
        ];

        foreach ($companies as $i => $c) {
            $this->insertItem($id, 'es', $i, $c);
            $this->insertItem($id, 'en', $i, $c);
        }
    }

    // ─── FAQ ─────────────────────────────────────────────────────

    protected function seedFaq(int $id): void
    {
        $this->insertContent($id, 'es', 'title', 'Preguntas frecuentes');
        $this->insertContent($id, 'es', 'subtitle', 'Todo lo que necesitas saber antes de comenzar');

        $faqs = [
            ['question' => '¿Qué tipo de tareas puedo solicitar?', 'answer' => 'Puedes solicitar desarrollo web, apps, landing pages, APIs, integraciones, automatizaciones con n8n, contenido SEO, copys de marketing, chatbots IA y mucho más. Si tienes duda, consulta con nuestro equipo.'],
            ['question' => '¿Cuánto tiempo tarda una tarea?', 'answer' => 'Depende de la complejidad. Las tareas simples (como un componente o un copy) se resuelven en 24-48h. Las tareas medianas en 3-5 días. Las más complejas se estiman y priorizan contigo.'],
            ['question' => '¿Cuántas tareas puedo tener activas?', 'answer' => 'Trabajamos en una tarea a la vez por membresía, asegurando máxima calidad y atención. Puedes tener tareas en cola para que siempre haya continuidad.'],
            ['question' => '¿Puedo cancelar en cualquier momento?', 'answer' => 'Sí, puedes cancelar tu membresía en cualquier momento. Sin penalizaciones ni letra chica.'],
            ['question' => '¿Qué herramientas de IA usan?', 'answer' => 'Utilizamos Claude de Anthropic, Codex, OpenAI, n8n para automatizaciones y herramientas complementarias según la tarea. Siempre con revisión humana para garantizar calidad.'],
            ['question' => '¿Cómo funciona la cola de tareas?', 'answer' => 'Agregas tareas a tu backlog, las priorizas con nosotros y comenzamos a trabajar en orden. Recibes actualizaciones en cada paso y aprobas antes de entregar.'],
        ];

        foreach ($faqs as $i => $faq) {
            $this->insertItem($id, 'es', $i, $faq);
        }

        $this->insertContent($id, 'en', 'title', 'Frequently asked questions');
        $this->insertContent($id, 'en', 'subtitle', 'Everything you need to know before getting started');

        $faqsEn = [
            ['question' => 'What types of tasks can I request?', 'answer' => 'You can request web development, apps, landing pages, APIs, integrations, n8n automations, SEO content, marketing copy, AI chatbots and much more.'],
            ['question' => 'How long does a task take?', 'answer' => 'It depends on complexity. Simple tasks (like a component or copy) are resolved in 24-48h. Medium tasks in 3-5 days. More complex ones are estimated and prioritized with you.'],
            ['question' => 'How many active tasks can I have?', 'answer' => 'We work on one task at a time per membership, ensuring maximum quality and attention. You can queue tasks for continuous flow.'],
            ['question' => 'Can I cancel anytime?', 'answer' => 'Yes, you can cancel your membership at any time. No penalties, no fine print.'],
            ['question' => 'What AI tools do you use?', 'answer' => "We use Anthropic's Claude, Codex, OpenAI, n8n for automations and complementary tools depending on the task — always with human review to ensure quality."],
            ['question' => 'How does the task queue work?', 'answer' => 'You add tasks to your backlog, prioritize them with us and we start working in order. You receive updates at each step and approve before delivery.'],
        ];

        foreach ($faqsEn as $i => $faq) {
            $this->insertItem($id, 'en', $i, $faq);
        }
    }

    // ─── CTA ─────────────────────────────────────────────────────

    protected function seedCta(int $id): void
    {
        $this->insertContent($id, 'es', 'title', '¿Listo para escalar con IA?');
        $this->insertContent($id, 'es', 'subtitle', 'Únete a AAPP HOST hoy y empieza a ejecutar tareas mañana. Sin burocracia, sin esperas.');
        $this->insertContent($id, 'es', 'button_text', 'Comenzar membresía');
        $this->insertContent($id, 'es', 'button_url', '/register');

        $this->insertContent($id, 'en', 'title', 'Ready to scale with AI?');
        $this->insertContent($id, 'en', 'subtitle', 'Join AAPP HOST today and start executing tasks tomorrow. No bureaucracy, no waiting.');
        $this->insertContent($id, 'en', 'button_text', 'Start membership');
        $this->insertContent($id, 'en', 'button_url', '/register');
    }

    public function down(): void
    {
        DB::table('landing_pages')->where('slug', 'aapp-host')->delete();
    }
};
