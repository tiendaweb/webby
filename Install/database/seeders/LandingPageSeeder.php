<?php

namespace Database\Seeders;

use App\Models\LandingContent;
use App\Models\LandingItem;
use App\Models\LandingSection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class LandingPageSeeder extends Seeder
{
    /**
     * Supported locales for seeding.
     */
    protected array $locales = ['en', 'ar', 'de', 'fr', 'ja', 'ru', 'it', 'zh', 'id', 'pt'];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Skip if sections already exist (e.g. seeded by migration)
        if (LandingSection::count() > 0) {
            return;
        }

        // Create all sections in order
        $sections = [
            ['type' => 'hero', 'sort_order' => 0, 'is_enabled' => true],
            ['type' => 'social_proof', 'sort_order' => 1, 'is_enabled' => true],
            ['type' => 'features', 'sort_order' => 2, 'is_enabled' => true, 'settings' => ['layout' => 'bento', 'show_icons' => true]],
            ['type' => 'product_showcase', 'sort_order' => 3, 'is_enabled' => true],
            ['type' => 'use_cases', 'sort_order' => 4, 'is_enabled' => true],
            ['type' => 'pricing', 'sort_order' => 5, 'is_enabled' => true],
            ['type' => 'categories', 'sort_order' => 6, 'is_enabled' => true],
            ['type' => 'trusted_by', 'sort_order' => 7, 'is_enabled' => false],
            ['type' => 'testimonials', 'sort_order' => 8, 'is_enabled' => false],
            ['type' => 'faq', 'sort_order' => 9, 'is_enabled' => false],
            ['type' => 'cta', 'sort_order' => 10, 'is_enabled' => true],
        ];

        foreach ($sections as $sectionData) {
            LandingSection::create($sectionData);
        }

        // Seed content for each section (Hero is AI-powered, no database content needed)
        $this->seedSocialProofSection();
        $this->seedFeaturesSection();
        $this->seedProductShowcaseSection();
        $this->seedUseCasesSection();
        $this->seedPricingSection();
        $this->seedCategoriesSection();
        $this->seedTrustedBySection();
        $this->seedTestimonialsSection();
        $this->seedFaqSection();
        $this->seedCtaSection();
    }

    protected function seedSocialProofSection(): void
    {
        $section = LandingSection::where('type', 'social_proof')->first();

        $translations = [
            'en' => [
                'users_label' => 'Happy users',
                'projects_label' => 'Projects created',
                'uptime_label' => 'Availability',
                'uptime_value' => 'High',
            ],
            'ar' => [
                'users_label' => 'مستخدمون سعداء',
                'projects_label' => 'مشاريع تم إنشاؤها',
                'uptime_label' => 'التوفر',
                'uptime_value' => 'عالي',
            ],
            'de' => [
                'users_label' => 'Zufriedene Nutzer',
                'projects_label' => 'Erstellte Projekte',
                'uptime_label' => 'Verfügbarkeit',
                'uptime_value' => 'Hoch',
            ],
            'fr' => [
                'users_label' => 'Utilisateurs satisfaits',
                'projects_label' => 'Projets créés',
                'uptime_label' => 'Disponibilité',
                'uptime_value' => 'Élevée',
            ],
            'ja' => [
                'users_label' => '満足したユーザー',
                'projects_label' => '作成されたプロジェクト',
                'uptime_label' => '可用性',
                'uptime_value' => '高い',
            ],
            'ru' => [
                'users_label' => 'Довольных пользователей',
                'projects_label' => 'Созданных проектов',
                'uptime_label' => 'Доступность',
                'uptime_value' => 'Высокая',
            ],
            'it' => [
                'users_label' => 'Utenti soddisfatti',
                'projects_label' => 'Progetti creati',
                'uptime_label' => 'Disponibilità',
                'uptime_value' => 'Alta',
            ],
            'zh' => [
                'users_label' => '满意用户',
                'projects_label' => '已创建项目',
                'uptime_label' => '可用性',
                'uptime_value' => '高',
            ],
            'id' => [
                'users_label' => 'Pengguna puas',
                'projects_label' => 'Proyek dibuat',
                'uptime_label' => 'Ketersediaan',
                'uptime_value' => 'Tinggi',
            ],
            'pt' => [
                'users_label' => 'Usuários satisfeitos',
                'projects_label' => 'Projetos criados',
                'uptime_label' => 'Disponibilidade',
                'uptime_value' => 'Alta',
            ],
        ];

        foreach ($translations as $locale => $content) {
            $this->createContent($section, $locale, $content);
        }
    }

    protected function seedFeaturesSection(): void
    {
        $section = LandingSection::where('type', 'features')->first();

        $translations = [
            'en' => [
                'title' => 'Everything you need to build',
                'subtitle' => 'From idea to deployment, we\'ve got you covered with powerful features designed for modern development.',
            ],
            'ar' => [
                'title' => 'كل ما تحتاجه للبناء',
                'subtitle' => 'من الفكرة إلى النشر، نوفر لك ميزات قوية مصممة للتطوير الحديث.',
            ],
            'de' => [
                'title' => 'Alles was Sie zum Bauen brauchen',
                'subtitle' => 'Von der Idee bis zur Bereitstellung - wir bieten Ihnen leistungsstarke Funktionen für moderne Entwicklung.',
            ],
            'fr' => [
                'title' => 'Tout ce dont vous avez besoin',
                'subtitle' => 'De l\'idée au déploiement, nous vous offrons des fonctionnalités puissantes pour le développement moderne.',
            ],
            'ja' => [
                'title' => '構築に必要なすべて',
                'subtitle' => 'アイデアからデプロイまで、モダンな開発のための強力な機能を提供します。',
            ],
            'ru' => [
                'title' => 'Всё необходимое для разработки',
                'subtitle' => 'От идеи до развёртывания — мощные инструменты для современной разработки.',
            ],
            'it' => [
                'title' => 'Tutto ciò che ti serve per costruire',
                'subtitle' => 'Dall\'idea al deployment, ti offriamo funzionalità potenti progettate per lo sviluppo moderno.',
            ],
            'zh' => [
                'title' => '构建所需的一切',
                'subtitle' => '从创意到部署，我们为您提供专为现代开发设计的强大功能。',
            ],
            'id' => [
                'title' => 'Semua yang Anda butuhkan untuk membangun',
                'subtitle' => 'Dari ide hingga deployment, kami menyediakan fitur canggih yang dirancang untuk pengembangan modern.',
            ],
            'pt' => [
                'title' => 'Tudo que você precisa para construir',
                'subtitle' => 'Da ideia à implantação, oferecemos recursos poderosos projetados para o desenvolvimento moderno.',
            ],
        ];

        foreach ($translations as $locale => $content) {
            $this->createContent($section, $locale, $content);
        }

        // Create feature items for each locale
        $featureTranslations = [
            'en' => [
                ['title' => 'AI-Powered Development', 'description' => 'Describe what you want, and watch it come to life. Our AI understands context and builds complete applications.', 'icon' => 'Sparkles', 'size' => 'large'],
                ['title' => 'Real-time Preview', 'description' => 'See your changes instantly as the AI builds your project. No waiting, no refreshing.', 'icon' => 'Eye', 'size' => 'medium'],
                ['title' => 'Built-in Code Editor', 'description' => 'Full Monaco editor with syntax highlighting, file tree, and code completion.', 'icon' => 'Code', 'size' => 'medium'],
                ['title' => 'Export & Deploy', 'description' => 'Host on our platform or export your code to deploy anywhere.', 'icon' => 'Download', 'size' => 'small'],
                ['title' => 'Smart Templates', 'description' => 'Start with AI-selected templates that match your project needs perfectly.', 'icon' => 'LayoutTemplate', 'size' => 'small'],
                ['title' => 'Iterative Refinement', 'description' => 'Keep chatting to refine and improve your creation until it\'s perfect.', 'icon' => 'MessageSquare', 'size' => 'small'],
                ['title' => 'Custom Subdomains', 'description' => 'Publish your project to a custom subdomain and share it with the world.', 'icon' => 'Globe', 'size' => 'small'],
            ],
            'ar' => [
                ['title' => 'تطوير بالذكاء الاصطناعي', 'description' => 'صف ما تريده وشاهده يتحقق. الذكاء الاصطناعي يفهم السياق ويبني تطبيقات كاملة.', 'icon' => 'Sparkles', 'size' => 'large'],
                ['title' => 'معاينة فورية', 'description' => 'شاهد التغييرات فوراً أثناء بناء الذكاء الاصطناعي لمشروعك.', 'icon' => 'Eye', 'size' => 'medium'],
                ['title' => 'محرر أكواد مدمج', 'description' => 'محرر Monaco كامل مع تمييز الصياغة وشجرة الملفات.', 'icon' => 'Code', 'size' => 'medium'],
                ['title' => 'تصدير ونشر', 'description' => 'استضف على منصتنا أو صدّر الكود للنشر في أي مكان.', 'icon' => 'Download', 'size' => 'small'],
                ['title' => 'قوالب ذكية', 'description' => 'ابدأ بقوالب يختارها الذكاء الاصطناعي تناسب احتياجات مشروعك.', 'icon' => 'LayoutTemplate', 'size' => 'small'],
                ['title' => 'تحسين تكراري', 'description' => 'استمر بالمحادثة لتحسين إبداعك حتى يصبح مثالياً.', 'icon' => 'MessageSquare', 'size' => 'small'],
                ['title' => 'نطاقات فرعية مخصصة', 'description' => 'انشر مشروعك على نطاق فرعي مخصص وشاركه مع العالم.', 'icon' => 'Globe', 'size' => 'small'],
            ],
            'de' => [
                ['title' => 'KI-gestützte Entwicklung', 'description' => 'Beschreiben Sie, was Sie wollen, und sehen Sie zu, wie es entsteht. Unsere KI versteht den Kontext.', 'icon' => 'Sparkles', 'size' => 'large'],
                ['title' => 'Echtzeit-Vorschau', 'description' => 'Sehen Sie Ihre Änderungen sofort, während die KI Ihr Projekt erstellt.', 'icon' => 'Eye', 'size' => 'medium'],
                ['title' => 'Integrierter Code-Editor', 'description' => 'Vollständiger Monaco-Editor mit Syntaxhervorhebung und Dateibaum.', 'icon' => 'Code', 'size' => 'medium'],
                ['title' => 'Exportieren & Bereitstellen', 'description' => 'Hosten Sie auf unserer Plattform oder exportieren Sie Ihren Code.', 'icon' => 'Download', 'size' => 'small'],
                ['title' => 'Intelligente Vorlagen', 'description' => 'Starten Sie mit KI-ausgewählten Vorlagen, die perfekt zu Ihrem Projekt passen.', 'icon' => 'LayoutTemplate', 'size' => 'small'],
                ['title' => 'Iterative Verfeinerung', 'description' => 'Chatten Sie weiter, um Ihre Kreation zu verfeinern und zu verbessern.', 'icon' => 'MessageSquare', 'size' => 'small'],
                ['title' => 'Eigene Subdomains', 'description' => 'Veröffentlichen Sie Ihr Projekt auf einer eigenen Subdomain.', 'icon' => 'Globe', 'size' => 'small'],
            ],
            'fr' => [
                ['title' => 'Développement par IA', 'description' => 'Décrivez ce que vous voulez et regardez-le prendre vie. Notre IA comprend le contexte.', 'icon' => 'Sparkles', 'size' => 'large'],
                ['title' => 'Aperçu en temps réel', 'description' => 'Voyez vos modifications instantanément pendant que l\'IA construit votre projet.', 'icon' => 'Eye', 'size' => 'medium'],
                ['title' => 'Éditeur de code intégré', 'description' => 'Éditeur Monaco complet avec coloration syntaxique et arborescence.', 'icon' => 'Code', 'size' => 'medium'],
                ['title' => 'Exporter & Déployer', 'description' => 'Hébergez sur notre plateforme ou exportez votre code pour le déployer ailleurs.', 'icon' => 'Download', 'size' => 'small'],
                ['title' => 'Modèles intelligents', 'description' => 'Commencez avec des modèles sélectionnés par l\'IA adaptés à votre projet.', 'icon' => 'LayoutTemplate', 'size' => 'small'],
                ['title' => 'Raffinement itératif', 'description' => 'Continuez à discuter pour affiner et améliorer votre création.', 'icon' => 'MessageSquare', 'size' => 'small'],
                ['title' => 'Sous-domaines personnalisés', 'description' => 'Publiez votre projet sur un sous-domaine personnalisé.', 'icon' => 'Globe', 'size' => 'small'],
            ],
            'ja' => [
                ['title' => 'AI駆動開発', 'description' => '欲しいものを説明するだけで実現します。AIがコンテキストを理解し、完全なアプリを構築します。', 'icon' => 'Sparkles', 'size' => 'large'],
                ['title' => 'リアルタイムプレビュー', 'description' => 'AIがプロジェクトを構築する間、変更を即座に確認できます。', 'icon' => 'Eye', 'size' => 'medium'],
                ['title' => '内蔵コードエディタ', 'description' => 'シンタックスハイライトとファイルツリーを備えたMonacoエディタ。', 'icon' => 'Code', 'size' => 'medium'],
                ['title' => 'エクスポート＆デプロイ', 'description' => '当社プラットフォームでホストするか、コードをエクスポートして任意の場所にデプロイ。', 'icon' => 'Download', 'size' => 'small'],
                ['title' => 'スマートテンプレート', 'description' => 'プロジェクトに最適なAI選択テンプレートから始めましょう。', 'icon' => 'LayoutTemplate', 'size' => 'small'],
                ['title' => '反復的改善', 'description' => '完璧になるまでチャットを続けて創作物を改善しましょう。', 'icon' => 'MessageSquare', 'size' => 'small'],
                ['title' => 'カスタムサブドメイン', 'description' => 'カスタムサブドメインでプロジェクトを公開し、世界と共有。', 'icon' => 'Globe', 'size' => 'small'],
            ],
            'ru' => [
                ['title' => 'Разработка с ИИ', 'description' => 'Опишите, что вы хотите, и наблюдайте, как это оживает. Наш ИИ понимает контекст.', 'icon' => 'Sparkles', 'size' => 'large'],
                ['title' => 'Предпросмотр в реальном времени', 'description' => 'Мгновенно видьте изменения, пока ИИ создаёт ваш проект.', 'icon' => 'Eye', 'size' => 'medium'],
                ['title' => 'Встроенный редактор кода', 'description' => 'Полноценный редактор Monaco с подсветкой синтаксиса и деревом файлов.', 'icon' => 'Code', 'size' => 'medium'],
                ['title' => 'Экспорт и развёртывание', 'description' => 'Размещайте на нашей платформе или экспортируйте код для развёртывания в любом месте.', 'icon' => 'Download', 'size' => 'small'],
                ['title' => 'Умные шаблоны', 'description' => 'Начните с шаблонов, выбранных ИИ, которые идеально подходят для вашего проекта.', 'icon' => 'LayoutTemplate', 'size' => 'small'],
                ['title' => 'Итеративное улучшение', 'description' => 'Продолжайте общение, чтобы улучшать своё творение до совершенства.', 'icon' => 'MessageSquare', 'size' => 'small'],
                ['title' => 'Собственные поддомены', 'description' => 'Публикуйте проект на собственном поддомене и делитесь им с миром.', 'icon' => 'Globe', 'size' => 'small'],
            ],
            'it' => [
                ['title' => 'Sviluppo con IA', 'description' => 'Descrivi ciò che vuoi e guardalo prendere vita. La nostra IA comprende il contesto e costruisce applicazioni complete.', 'icon' => 'Sparkles', 'size' => 'large'],
                ['title' => 'Anteprima in tempo reale', 'description' => 'Visualizza le modifiche istantaneamente mentre l\'IA costruisce il tuo progetto.', 'icon' => 'Eye', 'size' => 'medium'],
                ['title' => 'Editor di codice integrato', 'description' => 'Editor Monaco completo con evidenziazione della sintassi e albero dei file.', 'icon' => 'Code', 'size' => 'medium'],
                ['title' => 'Esporta e distribuisci', 'description' => 'Ospita sulla nostra piattaforma o esporta il codice per distribuirlo ovunque.', 'icon' => 'Download', 'size' => 'small'],
                ['title' => 'Template intelligenti', 'description' => 'Inizia con template selezionati dall\'IA perfetti per le esigenze del tuo progetto.', 'icon' => 'LayoutTemplate', 'size' => 'small'],
                ['title' => 'Raffinamento iterativo', 'description' => 'Continua a chattare per perfezionare e migliorare la tua creazione.', 'icon' => 'MessageSquare', 'size' => 'small'],
                ['title' => 'Sottodomini personalizzati', 'description' => 'Pubblica il tuo progetto su un sottodominio personalizzato e condividilo con il mondo.', 'icon' => 'Globe', 'size' => 'small'],
            ],
            'zh' => [
                ['title' => 'AI驱动开发', 'description' => '描述您想要的，看着它变为现实。我们的AI理解上下文并构建完整的应用程序。', 'icon' => 'Sparkles', 'size' => 'large'],
                ['title' => '实时预览', 'description' => '在AI构建项目的同时即时查看更改。无需等待，无需刷新。', 'icon' => 'Eye', 'size' => 'medium'],
                ['title' => '内置代码编辑器', 'description' => '完整的Monaco编辑器，支持语法高亮、文件树和代码补全。', 'icon' => 'Code', 'size' => 'medium'],
                ['title' => '导出与部署', 'description' => '在我们的平台上托管，或导出代码部署到任何地方。', 'icon' => 'Download', 'size' => 'small'],
                ['title' => '智能模板', 'description' => '使用AI精选的模板开始，完美匹配您的项目需求。', 'icon' => 'LayoutTemplate', 'size' => 'small'],
                ['title' => '迭代优化', 'description' => '持续对话，不断完善和改进您的作品直到完美。', 'icon' => 'MessageSquare', 'size' => 'small'],
                ['title' => '自定义子域名', 'description' => '将项目发布到自定义子域名，与全世界分享。', 'icon' => 'Globe', 'size' => 'small'],
            ],
            'id' => [
                ['title' => 'Pengembangan Bertenaga AI', 'description' => 'Jelaskan apa yang Anda inginkan, dan saksikan menjadi kenyataan. AI kami memahami konteks dan membangun aplikasi lengkap.', 'icon' => 'Sparkles', 'size' => 'large'],
                ['title' => 'Pratinjau Real-time', 'description' => 'Lihat perubahan Anda secara instan saat AI membangun proyek Anda.', 'icon' => 'Eye', 'size' => 'medium'],
                ['title' => 'Editor Kode Bawaan', 'description' => 'Editor Monaco lengkap dengan penyorotan sintaks dan pohon file.', 'icon' => 'Code', 'size' => 'medium'],
                ['title' => 'Ekspor & Deploy', 'description' => 'Host di platform kami atau ekspor kode untuk di-deploy di mana saja.', 'icon' => 'Download', 'size' => 'small'],
                ['title' => 'Template Cerdas', 'description' => 'Mulai dengan template pilihan AI yang sesuai dengan kebutuhan proyek Anda.', 'icon' => 'LayoutTemplate', 'size' => 'small'],
                ['title' => 'Penyempurnaan Iteratif', 'description' => 'Terus mengobrol untuk menyempurnakan dan meningkatkan kreasi Anda.', 'icon' => 'MessageSquare', 'size' => 'small'],
                ['title' => 'Subdomain Kustom', 'description' => 'Publikasikan proyek Anda ke subdomain kustom dan bagikan ke seluruh dunia.', 'icon' => 'Globe', 'size' => 'small'],
            ],
            'pt' => [
                ['title' => 'Desenvolvimento com IA', 'description' => 'Descreva o que você quer e veja ganhar vida. Nossa IA entende o contexto e constrói aplicações completas.', 'icon' => 'Sparkles', 'size' => 'large'],
                ['title' => 'Prévia em tempo real', 'description' => 'Veja suas alterações instantaneamente enquanto a IA constrói seu projeto.', 'icon' => 'Eye', 'size' => 'medium'],
                ['title' => 'Editor de código integrado', 'description' => 'Editor Monaco completo com destaque de sintaxe e árvore de arquivos.', 'icon' => 'Code', 'size' => 'medium'],
                ['title' => 'Exportar e implantar', 'description' => 'Hospede em nossa plataforma ou exporte seu código para implantar em qualquer lugar.', 'icon' => 'Download', 'size' => 'small'],
                ['title' => 'Templates inteligentes', 'description' => 'Comece com templates selecionados por IA perfeitos para as necessidades do seu projeto.', 'icon' => 'LayoutTemplate', 'size' => 'small'],
                ['title' => 'Refinamento iterativo', 'description' => 'Continue conversando para refinar e melhorar sua criação até ficar perfeita.', 'icon' => 'MessageSquare', 'size' => 'small'],
                ['title' => 'Subdomínios personalizados', 'description' => 'Publique seu projeto em um subdomínio personalizado e compartilhe com o mundo.', 'icon' => 'Globe', 'size' => 'small'],
            ],
        ];

        // Use same item keys across locales for consistency
        $itemKeys = array_map(fn () => Str::uuid()->toString(), range(0, 6));

        foreach ($featureTranslations as $locale => $features) {
            foreach ($features as $index => $feature) {
                LandingItem::create([
                    'section_id' => $section->id,
                    'locale' => $locale,
                    'item_key' => $itemKeys[$index],
                    'sort_order' => $index,
                    'is_enabled' => true,
                    'data' => $feature,
                ]);
            }
        }
    }

    protected function seedProductShowcaseSection(): void
    {
        $section = LandingSection::where('type', 'product_showcase')->first();

        $translations = [
            'en' => [
                'title' => 'See it in action',
                'subtitle' => 'A powerful development environment that lets you chat with AI, edit code, and manage projects all in one place.',
            ],
            'ar' => [
                'title' => 'شاهده أثناء العمل',
                'subtitle' => 'بيئة تطوير قوية تتيح لك الدردشة مع الذكاء الاصطناعي وتحرير الكود وإدارة المشاريع في مكان واحد.',
            ],
            'de' => [
                'title' => 'Erleben Sie es in Aktion',
                'subtitle' => 'Eine leistungsstarke Entwicklungsumgebung zum Chatten mit KI, Code bearbeiten und Projekte verwalten.',
            ],
            'fr' => [
                'title' => 'Voyez-le en action',
                'subtitle' => 'Un environnement de développement puissant pour discuter avec l\'IA, éditer le code et gérer les projets.',
            ],
            'ja' => [
                'title' => '実際の動作を見る',
                'subtitle' => 'AIとのチャット、コード編集、プロジェクト管理をすべて一箇所で行える強力な開発環境。',
            ],
            'ru' => [
                'title' => 'Посмотрите в действии',
                'subtitle' => 'Мощная среда разработки для общения с ИИ, редактирования кода и управления проектами.',
            ],
            'it' => [
                'title' => 'Guardalo in azione',
                'subtitle' => 'Un potente ambiente di sviluppo che ti permette di chattare con l\'IA, modificare il codice e gestire progetti in un unico posto.',
            ],
            'zh' => [
                'title' => '观看实际演示',
                'subtitle' => '一个强大的开发环境，让您可以与AI聊天、编辑代码和管理项目，一切尽在一处。',
            ],
            'id' => [
                'title' => 'Lihat dalam aksi',
                'subtitle' => 'Lingkungan pengembangan yang memungkinkan Anda mengobrol dengan AI, mengedit kode, dan mengelola proyek dalam satu tempat.',
            ],
            'pt' => [
                'title' => 'Veja em ação',
                'subtitle' => 'Um ambiente de desenvolvimento poderoso que permite conversar com a IA, editar código e gerenciar projetos em um só lugar.',
            ],
        ];

        foreach ($translations as $locale => $content) {
            $this->createContent($section, $locale, $content);
        }
    }

    protected function seedUseCasesSection(): void
    {
        $section = LandingSection::where('type', 'use_cases')->first();

        $translations = [
            'en' => [
                'title' => 'Built for everyone',
                'subtitle' => 'Whether you\'re a developer, designer, or entrepreneur, our platform helps you build faster and smarter.',
            ],
            'ar' => [
                'title' => 'مصمم للجميع',
                'subtitle' => 'سواء كنت مطوراً أو مصمماً أو رائد أعمال، منصتنا تساعدك على البناء بشكل أسرع وأذكى.',
            ],
            'de' => [
                'title' => 'Für alle entwickelt',
                'subtitle' => 'Ob Entwickler, Designer oder Unternehmer - unsere Plattform hilft Ihnen, schneller und intelligenter zu bauen.',
            ],
            'fr' => [
                'title' => 'Conçu pour tous',
                'subtitle' => 'Que vous soyez développeur, designer ou entrepreneur, notre plateforme vous aide à construire plus vite.',
            ],
            'ja' => [
                'title' => 'すべての人のために',
                'subtitle' => '開発者、デザイナー、起業家、誰でも私たちのプラットフォームでより速く、よりスマートに構築できます。',
            ],
            'ru' => [
                'title' => 'Создано для всех',
                'subtitle' => 'Разработчик, дизайнер или предприниматель — наша платформа поможет вам строить быстрее и умнее.',
            ],
            'it' => [
                'title' => 'Pensato per tutti',
                'subtitle' => 'Che tu sia uno sviluppatore, un designer o un imprenditore, la nostra piattaforma ti aiuta a costruire più velocemente e in modo più intelligente.',
            ],
            'zh' => [
                'title' => '为每个人而建',
                'subtitle' => '无论您是开发者、设计师还是企业家，我们的平台都能帮助您更快、更智能地构建。',
            ],
            'id' => [
                'title' => 'Dibangun untuk semua orang',
                'subtitle' => 'Baik Anda pengembang, desainer, atau pengusaha, platform kami membantu Anda membangun lebih cepat dan lebih cerdas.',
            ],
            'pt' => [
                'title' => 'Feito para todos',
                'subtitle' => 'Seja você desenvolvedor, designer ou empreendedor, nossa plataforma ajuda você a construir mais rápido e de forma mais inteligente.',
            ],
        ];

        foreach ($translations as $locale => $content) {
            $this->createContent($section, $locale, $content);
        }

        // Create persona items
        $personaTranslations = [
            'en' => [
                ['title' => 'Developers', 'description' => 'Accelerate your workflow with AI-assisted development. Focus on logic while AI handles boilerplate.', 'icon' => 'Terminal'],
                ['title' => 'Entrepreneurs', 'description' => 'Launch your MVP faster. Go from idea to working prototype in minutes, not weeks.', 'icon' => 'Rocket'],
                ['title' => 'Designers', 'description' => 'Bring your designs to life without writing code. Describe your vision and see it built.', 'icon' => 'Palette'],
                ['title' => 'Agencies', 'description' => 'Deliver more projects in less time. Scale your output without scaling your team.', 'icon' => 'Building'],
            ],
            'ar' => [
                ['title' => 'المطورون', 'description' => 'سرّع سير عملك مع التطوير بمساعدة الذكاء الاصطناعي. ركز على المنطق بينما يتولى الذكاء الاصطناعي الأكواد المتكررة.', 'icon' => 'Terminal'],
                ['title' => 'رواد الأعمال', 'description' => 'أطلق منتجك الأولي بشكل أسرع. انتقل من الفكرة إلى نموذج عمل في دقائق.', 'icon' => 'Rocket'],
                ['title' => 'المصممون', 'description' => 'حوّل تصاميمك إلى واقع بدون كتابة كود. صف رؤيتك وشاهدها تُبنى.', 'icon' => 'Palette'],
                ['title' => 'الوكالات', 'description' => 'أنجز المزيد من المشاريع في وقت أقل. وسّع إنتاجك دون توسيع فريقك.', 'icon' => 'Building'],
            ],
            'de' => [
                ['title' => 'Entwickler', 'description' => 'Beschleunigen Sie Ihren Workflow mit KI-unterstützter Entwicklung.', 'icon' => 'Terminal'],
                ['title' => 'Unternehmer', 'description' => 'Starten Sie Ihr MVP schneller. Von der Idee zum Prototyp in Minuten.', 'icon' => 'Rocket'],
                ['title' => 'Designer', 'description' => 'Erwecken Sie Ihre Designs zum Leben ohne Code zu schreiben.', 'icon' => 'Palette'],
                ['title' => 'Agenturen', 'description' => 'Liefern Sie mehr Projekte in kürzerer Zeit. Skalieren Sie ohne mehr Personal.', 'icon' => 'Building'],
            ],
            'fr' => [
                ['title' => 'Développeurs', 'description' => 'Accélérez votre flux de travail avec le développement assisté par IA.', 'icon' => 'Terminal'],
                ['title' => 'Entrepreneurs', 'description' => 'Lancez votre MVP plus rapidement. De l\'idée au prototype en quelques minutes.', 'icon' => 'Rocket'],
                ['title' => 'Designers', 'description' => 'Donnez vie à vos designs sans écrire de code. Décrivez votre vision.', 'icon' => 'Palette'],
                ['title' => 'Agences', 'description' => 'Livrez plus de projets en moins de temps. Augmentez votre production.', 'icon' => 'Building'],
            ],
            'ja' => [
                ['title' => '開発者', 'description' => 'AI支援開発でワークフローを加速。ロジックに集中し、AIが定型コードを処理。', 'icon' => 'Terminal'],
                ['title' => '起業家', 'description' => 'MVPをより早く立ち上げ。アイデアから動くプロトタイプまで数分で。', 'icon' => 'Rocket'],
                ['title' => 'デザイナー', 'description' => 'コードを書かずにデザインを実現。ビジョンを説明するだけ。', 'icon' => 'Palette'],
                ['title' => 'エージェンシー', 'description' => 'より短時間でより多くのプロジェクトを納品。チームを増やさずに生産性を拡大。', 'icon' => 'Building'],
            ],
            'ru' => [
                ['title' => 'Разработчики', 'description' => 'Ускорьте рабочий процесс с помощью ИИ. Сосредоточьтесь на логике.', 'icon' => 'Terminal'],
                ['title' => 'Предприниматели', 'description' => 'Запустите MVP быстрее. От идеи до прототипа за минуты.', 'icon' => 'Rocket'],
                ['title' => 'Дизайнеры', 'description' => 'Воплотите дизайн без написания кода. Опишите видение — увидьте результат.', 'icon' => 'Palette'],
                ['title' => 'Агентства', 'description' => 'Выполняйте больше проектов за меньшее время. Масштабируйтесь без найма.', 'icon' => 'Building'],
            ],
            'it' => [
                ['title' => 'Sviluppatori', 'description' => 'Accelera il tuo flusso di lavoro con lo sviluppo assistito dall\'IA. Concentrati sulla logica.', 'icon' => 'Terminal'],
                ['title' => 'Imprenditori', 'description' => 'Lancia il tuo MVP più velocemente. Dall\'idea al prototipo in pochi minuti.', 'icon' => 'Rocket'],
                ['title' => 'Designer', 'description' => 'Dai vita ai tuoi design senza scrivere codice. Descrivi la tua visione.', 'icon' => 'Palette'],
                ['title' => 'Agenzie', 'description' => 'Consegna più progetti in meno tempo. Scala la produzione senza ampliare il team.', 'icon' => 'Building'],
            ],
            'zh' => [
                ['title' => '开发者', 'description' => '借助AI辅助开发加速工作流程。专注于逻辑，让AI处理模板代码。', 'icon' => 'Terminal'],
                ['title' => '创业者', 'description' => '更快推出您的MVP。几分钟内从创意到可运行的原型。', 'icon' => 'Rocket'],
                ['title' => '设计师', 'description' => '无需编写代码即可实现设计。描述您的愿景，看着它被构建出来。', 'icon' => 'Palette'],
                ['title' => '代理机构', 'description' => '在更短时间内交付更多项目。无需扩大团队即可扩展产出。', 'icon' => 'Building'],
            ],
            'id' => [
                ['title' => 'Pengembang', 'description' => 'Percepat alur kerja Anda dengan pengembangan berbantuan AI. Fokus pada logika.', 'icon' => 'Terminal'],
                ['title' => 'Pengusaha', 'description' => 'Luncurkan MVP Anda lebih cepat. Dari ide ke prototipe dalam hitungan menit.', 'icon' => 'Rocket'],
                ['title' => 'Desainer', 'description' => 'Wujudkan desain Anda tanpa menulis kode. Jelaskan visi Anda.', 'icon' => 'Palette'],
                ['title' => 'Agensi', 'description' => 'Selesaikan lebih banyak proyek dalam waktu lebih singkat. Skalakan tanpa menambah tim.', 'icon' => 'Building'],
            ],
            'pt' => [
                ['title' => 'Desenvolvedores', 'description' => 'Acelere seu fluxo de trabalho com desenvolvimento assistido por IA. Foque na lógica.', 'icon' => 'Terminal'],
                ['title' => 'Empreendedores', 'description' => 'Lance seu MVP mais rápido. Da ideia ao protótipo funcional em minutos.', 'icon' => 'Rocket'],
                ['title' => 'Designers', 'description' => 'Dê vida aos seus designs sem escrever código. Descreva sua visão.', 'icon' => 'Palette'],
                ['title' => 'Agências', 'description' => 'Entregue mais projetos em menos tempo. Escale sem aumentar a equipe.', 'icon' => 'Building'],
            ],
        ];

        $itemKeys = array_map(fn () => Str::uuid()->toString(), range(0, 3));

        foreach ($personaTranslations as $locale => $personas) {
            foreach ($personas as $index => $persona) {
                LandingItem::create([
                    'section_id' => $section->id,
                    'locale' => $locale,
                    'item_key' => $itemKeys[$index],
                    'sort_order' => $index,
                    'is_enabled' => true,
                    'data' => $persona,
                ]);
            }
        }
    }

    protected function seedPricingSection(): void
    {
        $section = LandingSection::where('type', 'pricing')->first();

        $translations = [
            'en' => [
                'title' => 'Simple, transparent pricing',
                'subtitle' => 'Choose the plan that\'s right for you. No hidden fees.',
            ],
            'ar' => [
                'title' => 'أسعار بسيطة وشفافة',
                'subtitle' => 'اختر الخطة المناسبة لك. لا رسوم خفية.',
            ],
            'de' => [
                'title' => 'Einfache, transparente Preise',
                'subtitle' => 'Wählen Sie den richtigen Plan. Keine versteckten Gebühren.',
            ],
            'fr' => [
                'title' => 'Tarification simple et transparente',
                'subtitle' => 'Choisissez le plan qui vous convient. Pas de frais cachés.',
            ],
            'ja' => [
                'title' => 'シンプルで透明な料金',
                'subtitle' => 'あなたに合ったプランを選択。隠れた料金はありません。',
            ],
            'ru' => [
                'title' => 'Простые и прозрачные цены',
                'subtitle' => 'Выберите подходящий план. Никаких скрытых платежей.',
            ],
            'it' => [
                'title' => 'Prezzi semplici e trasparenti',
                'subtitle' => 'Scegli il piano giusto per te. Nessun costo nascosto.',
            ],
            'zh' => [
                'title' => '简单透明的定价',
                'subtitle' => '选择适合您的计划。没有隐藏费用。',
            ],
            'id' => [
                'title' => 'Harga sederhana dan transparan',
                'subtitle' => 'Pilih paket yang tepat untuk Anda. Tanpa biaya tersembunyi.',
            ],
            'pt' => [
                'title' => 'Preços simples e transparentes',
                'subtitle' => 'Escolha o plano ideal para você. Sem taxas ocultas.',
            ],
        ];

        foreach ($translations as $locale => $content) {
            $this->createContent($section, $locale, $content);
        }
    }

    protected function seedCategoriesSection(): void
    {
        $section = LandingSection::where('type', 'categories')->first();

        $translations = [
            'en' => [
                'title' => 'What will you build?',
                'subtitle' => 'From landing pages to complex web applications, explore what you can create.',
            ],
            'ar' => [
                'title' => 'ماذا ستبني؟',
                'subtitle' => 'من صفحات الهبوط إلى تطبيقات الويب المعقدة، اكتشف ما يمكنك إنشاؤه.',
            ],
            'de' => [
                'title' => 'Was werden Sie bauen?',
                'subtitle' => 'Von Landing Pages bis zu komplexen Webanwendungen - entdecken Sie Ihre Möglichkeiten.',
            ],
            'fr' => [
                'title' => 'Que allez-vous créer ?',
                'subtitle' => 'Des pages d\'atterrissage aux applications web complexes, explorez vos possibilités.',
            ],
            'ja' => [
                'title' => '何を作りますか？',
                'subtitle' => 'ランディングページから複雑なWebアプリまで、作成できるものを探索しましょう。',
            ],
            'ru' => [
                'title' => 'Что вы создадите?',
                'subtitle' => 'От лендингов до сложных веб-приложений — исследуйте возможности.',
            ],
            'it' => [
                'title' => 'Cosa costruirai?',
                'subtitle' => 'Dalle landing page alle applicazioni web complesse, esplora cosa puoi creare.',
            ],
            'zh' => [
                'title' => '您将构建什么？',
                'subtitle' => '从着陆页到复杂的Web应用程序，探索您可以创建的内容。',
            ],
            'id' => [
                'title' => 'Apa yang akan Anda bangun?',
                'subtitle' => 'Dari halaman landing hingga aplikasi web kompleks, jelajahi apa yang dapat Anda buat.',
            ],
            'pt' => [
                'title' => 'O que você vai construir?',
                'subtitle' => 'De landing pages a aplicações web complexas, explore o que você pode criar.',
            ],
        ];

        foreach ($translations as $locale => $content) {
            $this->createContent($section, $locale, $content);
        }

        // Create category items
        $categoryTranslations = [
            'en' => [
                ['name' => 'Landing Pages', 'icon' => 'Layout'],
                ['name' => 'Dashboards', 'icon' => 'LayoutDashboard'],
                ['name' => 'E-commerce', 'icon' => 'ShoppingCart'],
                ['name' => 'Portfolios', 'icon' => 'Briefcase'],
                ['name' => 'Web Apps', 'icon' => 'Globe'],
                ['name' => 'Admin Panels', 'icon' => 'Settings'],
            ],
            'ar' => [
                ['name' => 'صفحات الهبوط', 'icon' => 'Layout'],
                ['name' => 'لوحات التحكم', 'icon' => 'LayoutDashboard'],
                ['name' => 'التجارة الإلكترونية', 'icon' => 'ShoppingCart'],
                ['name' => 'معارض الأعمال', 'icon' => 'Briefcase'],
                ['name' => 'تطبيقات الويب', 'icon' => 'Globe'],
                ['name' => 'لوحات الإدارة', 'icon' => 'Settings'],
            ],
            'de' => [
                ['name' => 'Landing Pages', 'icon' => 'Layout'],
                ['name' => 'Dashboards', 'icon' => 'LayoutDashboard'],
                ['name' => 'E-Commerce', 'icon' => 'ShoppingCart'],
                ['name' => 'Portfolios', 'icon' => 'Briefcase'],
                ['name' => 'Web-Apps', 'icon' => 'Globe'],
                ['name' => 'Admin-Panels', 'icon' => 'Settings'],
            ],
            'fr' => [
                ['name' => 'Pages d\'atterrissage', 'icon' => 'Layout'],
                ['name' => 'Tableaux de bord', 'icon' => 'LayoutDashboard'],
                ['name' => 'E-commerce', 'icon' => 'ShoppingCart'],
                ['name' => 'Portfolios', 'icon' => 'Briefcase'],
                ['name' => 'Applications web', 'icon' => 'Globe'],
                ['name' => 'Panneaux d\'admin', 'icon' => 'Settings'],
            ],
            'ja' => [
                ['name' => 'ランディングページ', 'icon' => 'Layout'],
                ['name' => 'ダッシュボード', 'icon' => 'LayoutDashboard'],
                ['name' => 'Eコマース', 'icon' => 'ShoppingCart'],
                ['name' => 'ポートフォリオ', 'icon' => 'Briefcase'],
                ['name' => 'Webアプリ', 'icon' => 'Globe'],
                ['name' => '管理パネル', 'icon' => 'Settings'],
            ],
            'ru' => [
                ['name' => 'Лендинги', 'icon' => 'Layout'],
                ['name' => 'Дашборды', 'icon' => 'LayoutDashboard'],
                ['name' => 'Интернет-магазины', 'icon' => 'ShoppingCart'],
                ['name' => 'Портфолио', 'icon' => 'Briefcase'],
                ['name' => 'Веб-приложения', 'icon' => 'Globe'],
                ['name' => 'Админ-панели', 'icon' => 'Settings'],
            ],
            'it' => [
                ['name' => 'Landing Page', 'icon' => 'Layout'],
                ['name' => 'Dashboard', 'icon' => 'LayoutDashboard'],
                ['name' => 'E-commerce', 'icon' => 'ShoppingCart'],
                ['name' => 'Portfolio', 'icon' => 'Briefcase'],
                ['name' => 'App Web', 'icon' => 'Globe'],
                ['name' => 'Pannelli Admin', 'icon' => 'Settings'],
            ],
            'zh' => [
                ['name' => '着陆页', 'icon' => 'Layout'],
                ['name' => '仪表板', 'icon' => 'LayoutDashboard'],
                ['name' => '电子商务', 'icon' => 'ShoppingCart'],
                ['name' => '作品集', 'icon' => 'Briefcase'],
                ['name' => 'Web应用', 'icon' => 'Globe'],
                ['name' => '管理面板', 'icon' => 'Settings'],
            ],
            'id' => [
                ['name' => 'Halaman Landing', 'icon' => 'Layout'],
                ['name' => 'Dashboard', 'icon' => 'LayoutDashboard'],
                ['name' => 'E-commerce', 'icon' => 'ShoppingCart'],
                ['name' => 'Portofolio', 'icon' => 'Briefcase'],
                ['name' => 'Aplikasi Web', 'icon' => 'Globe'],
                ['name' => 'Panel Admin', 'icon' => 'Settings'],
            ],
            'pt' => [
                ['name' => 'Landing Pages', 'icon' => 'Layout'],
                ['name' => 'Dashboards', 'icon' => 'LayoutDashboard'],
                ['name' => 'E-commerce', 'icon' => 'ShoppingCart'],
                ['name' => 'Portfólios', 'icon' => 'Briefcase'],
                ['name' => 'Aplicações Web', 'icon' => 'Globe'],
                ['name' => 'Painéis Admin', 'icon' => 'Settings'],
            ],
        ];

        $itemKeys = array_map(fn () => Str::uuid()->toString(), range(0, 5));

        foreach ($categoryTranslations as $locale => $categories) {
            foreach ($categories as $index => $category) {
                LandingItem::create([
                    'section_id' => $section->id,
                    'locale' => $locale,
                    'item_key' => $itemKeys[$index],
                    'sort_order' => $index,
                    'is_enabled' => true,
                    'data' => $category,
                ]);
            }
        }
    }

    protected function seedTrustedBySection(): void
    {
        $section = LandingSection::where('type', 'trusted_by')->first();

        $translations = [
            'en' => ['title' => 'Trusted by teams at'],
            'ar' => ['title' => 'موثوق به من فرق في'],
            'de' => ['title' => 'Vertraut von Teams bei'],
            'fr' => ['title' => 'Fait confiance par les équipes de'],
            'ja' => ['title' => '信頼されているチーム'],
            'ru' => ['title' => 'Нам доверяют команды'],
            'it' => ['title' => 'Scelto dai team di'],
            'zh' => ['title' => '受到以下团队的信赖'],
            'id' => ['title' => 'Dipercaya oleh tim di'],
            'pt' => ['title' => 'Confiado por equipes de'],
        ];

        foreach ($translations as $locale => $content) {
            $this->createContent($section, $locale, $content);
        }

        // Company logos are the same across locales (brand names don't translate)
        $companies = [
            ['name' => 'TechCorp', 'initial' => 'T', 'color' => 'bg-blue-500'],
            ['name' => 'StartupHQ', 'initial' => 'S', 'color' => 'bg-green-500'],
            ['name' => 'DesignCo', 'initial' => 'D', 'color' => 'bg-purple-500'],
            ['name' => 'DevAgency', 'initial' => 'A', 'color' => 'bg-orange-500'],
            ['name' => 'BuilderInc', 'initial' => 'B', 'color' => 'bg-pink-500'],
        ];

        // Only create for English since logos are language-independent
        foreach ($companies as $index => $company) {
            LandingItem::create([
                'section_id' => $section->id,
                'locale' => 'en',
                'item_key' => Str::uuid()->toString(),
                'sort_order' => $index,
                'is_enabled' => true,
                'data' => $company,
            ]);
        }
    }

    protected function seedTestimonialsSection(): void
    {
        $section = LandingSection::where('type', 'testimonials')->first();

        $translations = [
            'en' => [
                'title' => 'What our users say',
                'subtitle' => 'Join thousands of satisfied customers who have transformed their workflow.',
            ],
            'ar' => [
                'title' => 'ماذا يقول مستخدمونا',
                'subtitle' => 'انضم إلى آلاف العملاء الراضين الذين غيّروا طريقة عملهم.',
            ],
            'de' => [
                'title' => 'Was unsere Nutzer sagen',
                'subtitle' => 'Schließen Sie sich Tausenden zufriedener Kunden an.',
            ],
            'fr' => [
                'title' => 'Ce que disent nos utilisateurs',
                'subtitle' => 'Rejoignez des milliers de clients satisfaits.',
            ],
            'ja' => [
                'title' => 'ユーザーの声',
                'subtitle' => 'ワークフローを変革した何千もの満足したお客様に加わりましょう。',
            ],
            'ru' => [
                'title' => 'Отзывы пользователей',
                'subtitle' => 'Присоединяйтесь к тысячам довольных клиентов.',
            ],
            'it' => [
                'title' => 'Cosa dicono i nostri utenti',
                'subtitle' => 'Unisciti a migliaia di clienti soddisfatti che hanno trasformato il loro flusso di lavoro.',
            ],
            'zh' => [
                'title' => '用户评价',
                'subtitle' => '加入数千名满意客户的行列，他们已经改变了自己的工作方式。',
            ],
            'id' => [
                'title' => 'Apa kata pengguna kami',
                'subtitle' => 'Bergabunglah dengan ribuan pelanggan puas yang telah mengubah alur kerja mereka.',
            ],
            'pt' => [
                'title' => 'O que nossos usuários dizem',
                'subtitle' => 'Junte-se a milhares de clientes satisfeitos que transformaram seu fluxo de trabalho.',
            ],
        ];

        foreach ($translations as $locale => $content) {
            $this->createContent($section, $locale, $content);
        }

        // Sample testimonials - only English for now (testimonials are typically real quotes)
        $testimonials = [
            [
                'quote' => 'This tool completely changed how we build prototypes. What used to take weeks now takes hours.',
                'author' => 'Sarah Chen',
                'role' => 'Product Manager at TechStart',
                'avatar' => null,
                'rating' => 5,
            ],
            [
                'quote' => 'The AI understands exactly what I want. It\'s like having a senior developer on my team.',
                'author' => 'Marcus Johnson',
                'role' => 'Founder at BuildFast',
                'avatar' => null,
                'rating' => 5,
            ],
            [
                'quote' => 'I launched my startup\'s website in a single afternoon. Absolutely incredible.',
                'author' => 'Emily Rodriguez',
                'role' => 'CEO at LaunchPad',
                'avatar' => null,
                'rating' => 5,
            ],
        ];

        foreach ($testimonials as $index => $testimonial) {
            LandingItem::create([
                'section_id' => $section->id,
                'locale' => 'en',
                'item_key' => Str::uuid()->toString(),
                'sort_order' => $index,
                'is_enabled' => true,
                'data' => $testimonial,
            ]);
        }
    }

    protected function seedFaqSection(): void
    {
        $section = LandingSection::where('type', 'faq')->first();

        $translations = [
            'en' => [
                'title' => 'Frequently asked questions',
                'subtitle' => 'Got questions? We\'ve got answers.',
            ],
            'ar' => [
                'title' => 'الأسئلة الشائعة',
                'subtitle' => 'لديك أسئلة؟ لدينا الإجابات.',
            ],
            'de' => [
                'title' => 'Häufig gestellte Fragen',
                'subtitle' => 'Haben Sie Fragen? Wir haben Antworten.',
            ],
            'fr' => [
                'title' => 'Questions fréquentes',
                'subtitle' => 'Des questions ? Nous avons les réponses.',
            ],
            'ja' => [
                'title' => 'よくある質問',
                'subtitle' => '質問がありますか？お答えします。',
            ],
            'ru' => [
                'title' => 'Часто задаваемые вопросы',
                'subtitle' => 'Есть вопросы? У нас есть ответы.',
            ],
            'it' => [
                'title' => 'Domande frequenti',
                'subtitle' => 'Hai domande? Abbiamo le risposte.',
            ],
            'zh' => [
                'title' => '常见问题',
                'subtitle' => '有疑问？我们为您解答。',
            ],
            'id' => [
                'title' => 'Pertanyaan yang sering diajukan',
                'subtitle' => 'Punya pertanyaan? Kami punya jawabannya.',
            ],
            'pt' => [
                'title' => 'Perguntas frequentes',
                'subtitle' => 'Tem perguntas? Temos respostas.',
            ],
        ];

        foreach ($translations as $locale => $content) {
            $this->createContent($section, $locale, $content);
        }

        // FAQ items with translations
        $faqTranslations = [
            'en' => [
                ['question' => 'How does the AI build websites?', 'answer' => 'Our AI analyzes your description and generates clean, production-ready code. It understands context, follows best practices, and creates responsive designs automatically.'],
                ['question' => 'Can I export my code?', 'answer' => 'Yes! You can export your complete project as a zip file and deploy it anywhere. The code is clean, well-organized, and uses modern frameworks.'],
                ['question' => 'What technologies are supported?', 'answer' => 'We support modern web technologies including React, Vue, Tailwind CSS, and more. The AI selects the best stack based on your project requirements.'],
                ['question' => 'Is there a free plan?', 'answer' => 'Yes, we offer a free plan with limited build credits so you can try the platform. Upgrade anytime to unlock more features and credits.'],
            ],
            'ar' => [
                ['question' => 'كيف يبني الذكاء الاصطناعي المواقع؟', 'answer' => 'يحلل الذكاء الاصطناعي وصفك ويولّد كوداً نظيفاً جاهزاً للإنتاج. يفهم السياق ويتبع أفضل الممارسات وينشئ تصاميم متجاوبة تلقائياً.'],
                ['question' => 'هل يمكنني تصدير الكود؟', 'answer' => 'نعم! يمكنك تصدير مشروعك الكامل كملف مضغوط ونشره في أي مكان. الكود نظيف ومنظم ويستخدم أطر عمل حديثة.'],
                ['question' => 'ما هي التقنيات المدعومة؟', 'answer' => 'ندعم تقنيات الويب الحديثة بما في ذلك React و Vue و Tailwind CSS والمزيد.'],
                ['question' => 'هل هناك خطة مجانية؟', 'answer' => 'نعم، نقدم خطة مجانية مع رصيد بناء محدود لتجربة المنصة. يمكنك الترقية في أي وقت.'],
            ],
            'de' => [
                ['question' => 'Wie baut die KI Websites?', 'answer' => 'Unsere KI analysiert Ihre Beschreibung und generiert sauberen, produktionsreifen Code mit responsivem Design.'],
                ['question' => 'Kann ich meinen Code exportieren?', 'answer' => 'Ja! Sie können Ihr Projekt als ZIP-Datei exportieren und überall bereitstellen.'],
                ['question' => 'Welche Technologien werden unterstützt?', 'answer' => 'Wir unterstützen moderne Web-Technologien wie React, Vue, Tailwind CSS und mehr.'],
                ['question' => 'Gibt es einen kostenlosen Plan?', 'answer' => 'Ja, wir bieten einen kostenlosen Plan mit begrenzten Credits zum Ausprobieren.'],
            ],
            'fr' => [
                ['question' => 'Comment l\'IA construit-elle les sites ?', 'answer' => 'Notre IA analyse votre description et génère du code propre, prêt pour la production, avec un design responsive.'],
                ['question' => 'Puis-je exporter mon code ?', 'answer' => 'Oui ! Vous pouvez exporter votre projet en fichier ZIP et le déployer n\'importe où.'],
                ['question' => 'Quelles technologies sont supportées ?', 'answer' => 'Nous supportons les technologies web modernes comme React, Vue, Tailwind CSS, et plus.'],
                ['question' => 'Y a-t-il un plan gratuit ?', 'answer' => 'Oui, nous offrons un plan gratuit avec des crédits limités pour essayer la plateforme.'],
            ],
            'ja' => [
                ['question' => 'AIはどのようにウェブサイトを構築しますか？', 'answer' => '当社のAIは説明を分析し、クリーンで本番環境対応のコードを生成します。コンテキストを理解し、レスポンシブデザインを自動作成します。'],
                ['question' => 'コードをエクスポートできますか？', 'answer' => 'はい！プロジェクト全体をZIPファイルとしてエクスポートし、どこにでもデプロイできます。'],
                ['question' => 'どの技術がサポートされていますか？', 'answer' => 'React、Vue、Tailwind CSSなど、モダンなWeb技術をサポートしています。'],
                ['question' => '無料プランはありますか？', 'answer' => 'はい、プラットフォームを試すための限定クレジット付き無料プランを提供しています。'],
            ],
            'ru' => [
                ['question' => 'Как ИИ создаёт сайты?', 'answer' => 'Наш ИИ анализирует ваше описание и генерирует чистый, готовый к продакшену код с адаптивным дизайном.'],
                ['question' => 'Могу ли я экспортировать код?', 'answer' => 'Да! Вы можете экспортировать проект как ZIP-файл и развернуть его где угодно.'],
                ['question' => 'Какие технологии поддерживаются?', 'answer' => 'Мы поддерживаем современные веб-технологии: React, Vue, Tailwind CSS и другие.'],
                ['question' => 'Есть ли бесплатный план?', 'answer' => 'Да, мы предлагаем бесплатный план с ограниченными кредитами для пробного использования.'],
            ],
            'it' => [
                ['question' => 'Come fa l\'IA a costruire siti web?', 'answer' => 'La nostra IA analizza la tua descrizione e genera codice pulito e pronto per la produzione con design responsive.'],
                ['question' => 'Posso esportare il mio codice?', 'answer' => 'Sì! Puoi esportare il tuo progetto completo come file ZIP e distribuirlo ovunque.'],
                ['question' => 'Quali tecnologie sono supportate?', 'answer' => 'Supportiamo tecnologie web moderne tra cui React, Vue, Tailwind CSS e altre.'],
                ['question' => 'C\'è un piano gratuito?', 'answer' => 'Sì, offriamo un piano gratuito con crediti limitati per provare la piattaforma.'],
            ],
            'zh' => [
                ['question' => 'AI如何构建网站？', 'answer' => '我们的AI分析您的描述，生成干净的、可用于生产环境的代码，并自动创建响应式设计。'],
                ['question' => '我可以导出代码吗？', 'answer' => '可以！您可以将完整项目导出为ZIP文件，部署到任何地方。'],
                ['question' => '支持哪些技术？', 'answer' => '我们支持现代Web技术，包括React、Vue、Tailwind CSS等。'],
                ['question' => '有免费计划吗？', 'answer' => '有的，我们提供带有限额构建积分的免费计划，让您可以试用平台。'],
            ],
            'id' => [
                ['question' => 'Bagaimana AI membangun situs web?', 'answer' => 'AI kami menganalisis deskripsi Anda dan menghasilkan kode bersih yang siap produksi dengan desain responsif.'],
                ['question' => 'Bisakah saya mengekspor kode saya?', 'answer' => 'Ya! Anda dapat mengekspor proyek lengkap sebagai file ZIP dan men-deploy-nya di mana saja.'],
                ['question' => 'Teknologi apa yang didukung?', 'answer' => 'Kami mendukung teknologi web modern termasuk React, Vue, Tailwind CSS, dan lainnya.'],
                ['question' => 'Apakah ada paket gratis?', 'answer' => 'Ya, kami menawarkan paket gratis dengan kredit terbatas untuk mencoba platform.'],
            ],
            'pt' => [
                ['question' => 'Como a IA constrói sites?', 'answer' => 'Nossa IA analisa sua descrição e gera código limpo e pronto para produção com design responsivo.'],
                ['question' => 'Posso exportar meu código?', 'answer' => 'Sim! Você pode exportar seu projeto completo como arquivo ZIP e implantá-lo em qualquer lugar.'],
                ['question' => 'Quais tecnologias são suportadas?', 'answer' => 'Suportamos tecnologias web modernas incluindo React, Vue, Tailwind CSS e mais.'],
                ['question' => 'Existe um plano gratuito?', 'answer' => 'Sim, oferecemos um plano gratuito com créditos limitados para você experimentar a plataforma.'],
            ],
        ];

        $itemKeys = array_map(fn () => Str::uuid()->toString(), range(0, 3));

        foreach ($faqTranslations as $locale => $faqs) {
            foreach ($faqs as $index => $faq) {
                LandingItem::create([
                    'section_id' => $section->id,
                    'locale' => $locale,
                    'item_key' => $itemKeys[$index],
                    'sort_order' => $index,
                    'is_enabled' => true,
                    'data' => $faq,
                ]);
            }
        }
    }

    protected function seedCtaSection(): void
    {
        $section = LandingSection::where('type', 'cta')->first();

        $translations = [
            'en' => [
                'title' => 'Ready to build something amazing?',
                'subtitle' => 'Start building for free. No credit card required.',
                'button_text' => 'Start Building Today',
                'button_url' => '/register',
            ],
            'ar' => [
                'title' => 'مستعد لبناء شيء مذهل؟',
                'subtitle' => 'ابدأ البناء مجاناً. لا حاجة لبطاقة ائتمان.',
                'button_text' => 'ابدأ البناء اليوم',
                'button_url' => '/register',
            ],
            'de' => [
                'title' => 'Bereit, etwas Erstaunliches zu bauen?',
                'subtitle' => 'Starten Sie kostenlos. Keine Kreditkarte erforderlich.',
                'button_text' => 'Heute starten',
                'button_url' => '/register',
            ],
            'fr' => [
                'title' => 'Prêt à créer quelque chose d\'incroyable ?',
                'subtitle' => 'Commencez gratuitement. Pas de carte de crédit requise.',
                'button_text' => 'Commencer aujourd\'hui',
                'button_url' => '/register',
            ],
            'ja' => [
                'title' => '素晴らしいものを作る準備はできましたか？',
                'subtitle' => '無料で始めましょう。クレジットカードは不要です。',
                'button_text' => '今すぐ始める',
                'button_url' => '/register',
            ],
            'ru' => [
                'title' => 'Готовы создать что-то потрясающее?',
                'subtitle' => 'Начните бесплатно. Кредитная карта не требуется.',
                'button_text' => 'Начать сегодня',
                'button_url' => '/register',
            ],
            'it' => [
                'title' => 'Pronto a costruire qualcosa di straordinario?',
                'subtitle' => 'Inizia a costruire gratuitamente. Nessuna carta di credito richiesta.',
                'button_text' => 'Inizia oggi',
                'button_url' => '/register',
            ],
            'zh' => [
                'title' => '准备好构建令人惊叹的作品了吗？',
                'subtitle' => '免费开始构建。无需信用卡。',
                'button_text' => '立即开始',
                'button_url' => '/register',
            ],
            'id' => [
                'title' => 'Siap membangun sesuatu yang luar biasa?',
                'subtitle' => 'Mulai membangun gratis. Tidak perlu kartu kredit.',
                'button_text' => 'Mulai Hari Ini',
                'button_url' => '/register',
            ],
            'pt' => [
                'title' => 'Pronto para construir algo incrível?',
                'subtitle' => 'Comece a construir gratuitamente. Sem necessidade de cartão de crédito.',
                'button_text' => 'Comece Hoje',
                'button_url' => '/register',
            ],
        ];

        foreach ($translations as $locale => $content) {
            $this->createContent($section, $locale, $content);
        }
    }

    /**
     * Helper to create content records for a section.
     */
    protected function createContent(LandingSection $section, string $locale, array $fields): void
    {
        foreach ($fields as $field => $value) {
            LandingContent::create([
                'section_id' => $section->id,
                'locale' => $locale,
                'field' => $field,
                'value' => $value,
            ]);
        }
    }
}
