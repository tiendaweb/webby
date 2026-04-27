import { useCallback, useEffect, useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/LanguageContext';
import { getTranslatedTestimonials, type TestimonialItem } from './data';
import { cn } from '@/lib/utils';

interface TestimonialsSectionProps {
    content?: Record<string, unknown>;
    items?: TestimonialItem[];
    settings?: Record<string, unknown>;
}

function StarRating({ rating }: { rating: number }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    className={`h-4 w-4 ${
                        star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-muted text-muted'
                    }`}
                />
            ))}
        </div>
    );
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function TestimonialsSection({ content, items, settings: _settings }: TestimonialsSectionProps = {}) {
    const { t, isRtl } = useTranslation();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [canScroll, setCanScroll] = useState(false);
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

    // Use database items if provided, otherwise fall back to translated defaults
    const testimonials = items?.length ? items : getTranslatedTestimonials(t);

    // Get content with defaults - DB content takes priority
    const title = (content?.title as string) || t('What our users say');
    const subtitle = (content?.subtitle as string) || t('Join thousands of satisfied developers and teams who have transformed their workflow.');

    const autoplayPlugin = useMemo(
        () => Autoplay({ delay: 5000, stopOnInteraction: true, stopOnMouseEnter: true }),
        []
    );

    const [emblaRef, emblaApi] = useEmblaCarousel(
        {
            loop: true,
            align: 'start',
            slidesToScroll: 1,
            direction: isRtl ? 'rtl' : 'ltr',
        },
        [autoplayPlugin]
    );

    const scrollPrev = useCallback(() => {
        if (emblaApi) {
            autoplayPlugin.stop();
            emblaApi.scrollPrev();
        }
    }, [emblaApi, autoplayPlugin]);

    const scrollNext = useCallback(() => {
        if (emblaApi) {
            autoplayPlugin.stop();
            emblaApi.scrollNext();
        }
    }, [emblaApi, autoplayPlugin]);

    const onSelect = useCallback(() => {
        if (!emblaApi) return;
        setSelectedIndex(emblaApi.selectedScrollSnap());
        setScrollSnaps(emblaApi.scrollSnapList());
        setCanScroll(emblaApi.canScrollPrev() || emblaApi.canScrollNext());
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        emblaApi.on('select', onSelect);
        emblaApi.on('reInit', onSelect);
        return () => {
            emblaApi.off('select', onSelect);
            emblaApi.off('reInit', onSelect);
        };
    }, [emblaApi, onSelect]);

    return (
        <section className="py-16 lg:py-24 bg-muted/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
                        {title}
                    </h2>
                    <p className="text-lg text-muted-foreground/90 max-w-2xl mx-auto leading-relaxed">
                        {subtitle}
                    </p>
                </div>

                {/* Carousel */}
                <div className={cn("relative", canScroll && "px-12 md:px-14")}>
                    {/* Navigation Buttons - only show when scrolling is possible */}
                    {canScroll && (
                        <>
                            <Button
                                variant="outline"
                                size="icon"
                                className="absolute start-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
                                onClick={scrollPrev}
                                aria-label={t('Previous')}
                            >
                                {isRtl ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="absolute end-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-background"
                                onClick={scrollNext}
                                aria-label={t('Next')}
                            >
                                {isRtl ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                            </Button>
                        </>
                    )}

                    {/* Embla Carousel */}
                    <div className="overflow-hidden" ref={emblaRef}>
                        <div className="flex">
                            {testimonials.map((testimonial, index) => (
                                <div
                                    key={index}
                                    className="flex-[0_0_100%] min-w-0 px-2 md:flex-[0_0_50%] lg:flex-[0_0_33.333%]"
                                >
                                    <Card className="h-full group hover:shadow-lg transition-all duration-300">
                                        <CardContent className="p-6 flex flex-col h-full">
                                            {/* Rating */}
                                            {testimonial.rating && (
                                                <div className="mb-4">
                                                    <StarRating rating={testimonial.rating} />
                                                </div>
                                            )}

                                            {/* Quote */}
                                            <blockquote className="text-muted-foreground mb-6 leading-relaxed flex-1">
                                                "{testimonial.quote}"
                                            </blockquote>

                                            {/* Author */}
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    {testimonial.avatar && (
                                                        <AvatarImage
                                                            src={testimonial.avatar}
                                                            alt={testimonial.author}
                                                        />
                                                    )}
                                                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                                        {getInitials(testimonial.author)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-medium text-sm">
                                                        {testimonial.author}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {testimonial.company_url ? (
                                                            <a
                                                                href={testimonial.company_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="hover:underline hover:text-muted-foreground/80"
                                                            >
                                                                {testimonial.role}
                                                            </a>
                                                        ) : (
                                                            testimonial.role
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Dots Indicator - only show when scrolling is possible */}
                    {canScroll && scrollSnaps.length > 1 && (
                        <div className="flex justify-center gap-2 mt-6" role="tablist" aria-label={t('Testimonial slides')}>
                            {scrollSnaps.map((_, index) => (
                                <button
                                    key={index}
                                    role="tab"
                                    aria-selected={index === selectedIndex}
                                    aria-label={t('Go to slide :number', { number: index + 1 })}
                                    className={cn(
                                        'w-2 h-2 rounded-full transition-all duration-300',
                                        index === selectedIndex
                                            ? 'bg-primary w-6'
                                            : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                                    )}
                                    onClick={() => emblaApi?.scrollTo(index)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
