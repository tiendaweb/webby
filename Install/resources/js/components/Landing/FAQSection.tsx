import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { getTranslatedFAQs } from './data';

interface FAQItem {
    question: string;
    answer: string;
}

interface FAQSectionProps {
    content?: Record<string, unknown>;
    items?: FAQItem[];
    settings?: Record<string, unknown>;
}


function FAQItemComponent({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
    return (
        <Collapsible open={isOpen} onOpenChange={onToggle}>
            <div className="border-b border-border">
                <CollapsibleTrigger className="flex w-full items-center justify-between py-4 text-start hover:text-primary transition-colors">
                    <span className="font-medium pe-4">{item.question}</span>
                    <ChevronDown
                        className={cn(
                            'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
                            isOpen && 'rotate-180'
                        )}
                    />
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="pb-4 text-muted-foreground leading-relaxed prose prose-sm max-w-none">
                        {item.answer}
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}

export function FAQSection({ content, items, settings: _settings }: FAQSectionProps = {}) {
    const { t } = useTranslation();
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    // Use database items if provided, otherwise fall back to translated defaults
    const faqs = items?.length ? items : getTranslatedFAQs(t);

    // Get content with defaults - DB content takes priority
    const title = (content?.title as string) || t('Frequently asked questions');
    const subtitle = (content?.subtitle as string) || t('Have a different question? Reach out to our support team.');

    return (
        <section className="py-16 lg:py-24">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
                        {title}
                    </h2>
                    <p className="text-lg text-muted-foreground/90 leading-relaxed">
                        {subtitle}
                    </p>
                </div>

                {/* FAQ List */}
                <div className="divide-y divide-border border-t border-border">
                    {faqs.map((faq, index) => (
                        <FAQItemComponent
                            key={index}
                            item={faq}
                            isOpen={openIndex === index}
                            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
