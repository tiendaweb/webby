<?php

use App\Models\LandingContent;
use App\Models\LandingItem;
use App\Models\LandingSection;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Seed landing page content for Italian, Chinese, Indonesian, and Portuguese
     * on existing installations that already have landing sections.
     */
    public function up(): void
    {
        if (! Schema::hasTable('landing_sections') || ! Schema::hasTable('landing_contents') || ! Schema::hasTable('landing_items')) {
            return;
        }

        if (LandingSection::count() === 0) {
            return;
        }

        $newLocales = ['it', 'zh', 'id', 'pt'];

        $this->seedContentTranslations($newLocales);
        $this->seedItemTranslations($newLocales);
    }

    protected function seedContentTranslations(array $newLocales): void
    {
        $sectionTranslations = [
            'social_proof' => [
                'it' => ['users_label' => 'Utenti soddisfatti', 'projects_label' => 'Progetti creati', 'uptime_label' => 'Disponibilità', 'uptime_value' => 'Alta'],
                'zh' => ['users_label' => '满意用户', 'projects_label' => '已创建项目', 'uptime_label' => '可用性', 'uptime_value' => '高'],
                'id' => ['users_label' => 'Pengguna puas', 'projects_label' => 'Proyek dibuat', 'uptime_label' => 'Ketersediaan', 'uptime_value' => 'Tinggi'],
                'pt' => ['users_label' => 'Usuários satisfeitos', 'projects_label' => 'Projetos criados', 'uptime_label' => 'Disponibilidade', 'uptime_value' => 'Alta'],
            ],
            'features' => [
                'it' => ['title' => 'Tutto ciò che ti serve per costruire', 'subtitle' => 'Dall\'idea al deployment, ti offriamo funzionalità potenti progettate per lo sviluppo moderno.'],
                'zh' => ['title' => '构建所需的一切', 'subtitle' => '从创意到部署，我们为您提供专为现代开发设计的强大功能。'],
                'id' => ['title' => 'Semua yang Anda butuhkan untuk membangun', 'subtitle' => 'Dari ide hingga deployment, kami menyediakan fitur canggih yang dirancang untuk pengembangan modern.'],
                'pt' => ['title' => 'Tudo que você precisa para construir', 'subtitle' => 'Da ideia à implantação, oferecemos recursos poderosos projetados para o desenvolvimento moderno.'],
            ],
            'product_showcase' => [
                'it' => ['title' => 'Guardalo in azione', 'subtitle' => 'Un potente ambiente di sviluppo che ti permette di chattare con l\'IA, modificare il codice e gestire progetti in un unico posto.'],
                'zh' => ['title' => '观看实际演示', 'subtitle' => '一个强大的开发环境，让您可以与AI聊天、编辑代码和管理项目，一切尽在一处。'],
                'id' => ['title' => 'Lihat dalam aksi', 'subtitle' => 'Lingkungan pengembangan yang memungkinkan Anda mengobrol dengan AI, mengedit kode, dan mengelola proyek dalam satu tempat.'],
                'pt' => ['title' => 'Veja em ação', 'subtitle' => 'Um ambiente de desenvolvimento poderoso que permite conversar com a IA, editar código e gerenciar projetos em um só lugar.'],
            ],
            'use_cases' => [
                'it' => ['title' => 'Pensato per tutti', 'subtitle' => 'Che tu sia uno sviluppatore, un designer o un imprenditore, la nostra piattaforma ti aiuta a costruire più velocemente e in modo più intelligente.'],
                'zh' => ['title' => '为每个人而建', 'subtitle' => '无论您是开发者、设计师还是企业家，我们的平台都能帮助您更快、更智能地构建。'],
                'id' => ['title' => 'Dibangun untuk semua orang', 'subtitle' => 'Baik Anda pengembang, desainer, atau pengusaha, platform kami membantu Anda membangun lebih cepat dan lebih cerdas.'],
                'pt' => ['title' => 'Feito para todos', 'subtitle' => 'Seja você desenvolvedor, designer ou empreendedor, nossa plataforma ajuda você a construir mais rápido e de forma mais inteligente.'],
            ],
            'pricing' => [
                'it' => ['title' => 'Prezzi semplici e trasparenti', 'subtitle' => 'Scegli il piano giusto per te. Nessun costo nascosto.'],
                'zh' => ['title' => '简单透明的定价', 'subtitle' => '选择适合您的计划。没有隐藏费用。'],
                'id' => ['title' => 'Harga sederhana dan transparan', 'subtitle' => 'Pilih paket yang tepat untuk Anda. Tanpa biaya tersembunyi.'],
                'pt' => ['title' => 'Preços simples e transparentes', 'subtitle' => 'Escolha o plano ideal para você. Sem taxas ocultas.'],
            ],
            'categories' => [
                'it' => ['title' => 'Cosa costruirai?', 'subtitle' => 'Dalle landing page alle applicazioni web complesse, esplora cosa puoi creare.'],
                'zh' => ['title' => '您将构建什么？', 'subtitle' => '从着陆页到复杂的Web应用程序，探索您可以创建的内容。'],
                'id' => ['title' => 'Apa yang akan Anda bangun?', 'subtitle' => 'Dari halaman landing hingga aplikasi web kompleks, jelajahi apa yang dapat Anda buat.'],
                'pt' => ['title' => 'O que você vai construir?', 'subtitle' => 'De landing pages a aplicações web complexas, explore o que você pode criar.'],
            ],
            'trusted_by' => [
                'it' => ['title' => 'Scelto dai team di'],
                'zh' => ['title' => '受到以下团队的信赖'],
                'id' => ['title' => 'Dipercaya oleh tim di'],
                'pt' => ['title' => 'Confiado por equipes de'],
            ],
            'testimonials' => [
                'it' => ['title' => 'Cosa dicono i nostri utenti', 'subtitle' => 'Unisciti a migliaia di clienti soddisfatti che hanno trasformato il loro flusso di lavoro.'],
                'zh' => ['title' => '用户评价', 'subtitle' => '加入数千名满意客户的行列，他们已经改变了自己的工作方式。'],
                'id' => ['title' => 'Apa kata pengguna kami', 'subtitle' => 'Bergabunglah dengan ribuan pelanggan puas yang telah mengubah alur kerja mereka.'],
                'pt' => ['title' => 'O que nossos usuários dizem', 'subtitle' => 'Junte-se a milhares de clientes satisfeitos que transformaram seu fluxo de trabalho.'],
            ],
            'faq' => [
                'it' => ['title' => 'Domande frequenti', 'subtitle' => 'Hai domande? Abbiamo le risposte.'],
                'zh' => ['title' => '常见问题', 'subtitle' => '有疑问？我们为您解答。'],
                'id' => ['title' => 'Pertanyaan yang sering diajukan', 'subtitle' => 'Punya pertanyaan? Kami punya jawabannya.'],
                'pt' => ['title' => 'Perguntas frequentes', 'subtitle' => 'Tem perguntas? Temos respostas.'],
            ],
            'cta' => [
                'it' => ['title' => 'Pronto a costruire qualcosa di straordinario?', 'subtitle' => 'Inizia a costruire gratuitamente. Nessuna carta di credito richiesta.', 'button_text' => 'Inizia oggi', 'button_url' => '/register'],
                'zh' => ['title' => '准备好构建令人惊叹的作品了吗？', 'subtitle' => '免费开始构建。无需信用卡。', 'button_text' => '立即开始', 'button_url' => '/register'],
                'id' => ['title' => 'Siap membangun sesuatu yang luar biasa?', 'subtitle' => 'Mulai membangun gratis. Tidak perlu kartu kredit.', 'button_text' => 'Mulai Hari Ini', 'button_url' => '/register'],
                'pt' => ['title' => 'Pronto para construir algo incrível?', 'subtitle' => 'Comece a construir gratuitamente. Sem necessidade de cartão de crédito.', 'button_text' => 'Comece Hoje', 'button_url' => '/register'],
            ],
        ];

        foreach ($sectionTranslations as $sectionType => $locales) {
            $section = LandingSection::where('type', $sectionType)->first();
            if (! $section) {
                continue;
            }

            foreach ($locales as $locale => $fields) {
                if (! in_array($locale, $newLocales)) {
                    continue;
                }

                // Skip if content already exists for this locale
                if (LandingContent::where('section_id', $section->id)->where('locale', $locale)->exists()) {
                    continue;
                }

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
    }

    protected function seedItemTranslations(array $newLocales): void
    {
        $this->seedFeatureItems($newLocales);
        $this->seedUseCaseItems($newLocales);
        $this->seedCategoryItems($newLocales);
        $this->seedFaqItems($newLocales);
    }

    protected function seedFeatureItems(array $newLocales): void
    {
        $section = LandingSection::where('type', 'features')->first();
        if (! $section) {
            return;
        }

        $translations = [
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

        $this->createItemsFromEnglishKeys($section, $translations, $newLocales);
    }

    protected function seedUseCaseItems(array $newLocales): void
    {
        $section = LandingSection::where('type', 'use_cases')->first();
        if (! $section) {
            return;
        }

        $translations = [
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

        $this->createItemsFromEnglishKeys($section, $translations, $newLocales);
    }

    protected function seedCategoryItems(array $newLocales): void
    {
        $section = LandingSection::where('type', 'categories')->first();
        if (! $section) {
            return;
        }

        $translations = [
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

        $this->createItemsFromEnglishKeys($section, $translations, $newLocales);
    }

    protected function seedFaqItems(array $newLocales): void
    {
        $section = LandingSection::where('type', 'faq')->first();
        if (! $section) {
            return;
        }

        $translations = [
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

        $this->createItemsFromEnglishKeys($section, $translations, $newLocales);
    }

    /**
     * Create items for new locales by reusing existing English item_keys.
     *
     * Note: Maps translations to English items by positional index (sort_order).
     * This assumes English items have not been added/removed/reordered since the
     * initial LandingPageSeeder ran. If an admin has modified English items,
     * new locale items will gracefully skip any missing positions but may map
     * to incorrect item_keys for reordered items.
     */
    protected function createItemsFromEnglishKeys(LandingSection $section, array $translations, array $newLocales): void
    {
        // Get existing English items ordered by sort_order to map by index
        $englishItems = LandingItem::where('section_id', $section->id)
            ->where('locale', 'en')
            ->orderBy('sort_order')
            ->get();

        if ($englishItems->isEmpty()) {
            return;
        }

        foreach ($newLocales as $locale) {
            if (! isset($translations[$locale])) {
                continue;
            }

            // Skip if items already exist for this locale
            if (LandingItem::where('section_id', $section->id)->where('locale', $locale)->exists()) {
                continue;
            }

            foreach ($translations[$locale] as $index => $data) {
                if (! isset($englishItems[$index])) {
                    continue;
                }

                LandingItem::create([
                    'section_id' => $section->id,
                    'locale' => $locale,
                    'item_key' => $englishItems[$index]->item_key,
                    'sort_order' => $englishItems[$index]->sort_order,
                    'is_enabled' => $englishItems[$index]->is_enabled,
                    'data' => $data,
                ]);
            }
        }
    }

    public function down(): void
    {
        // Don't remove landing content on rollback as admins may have customized it
    }
};
